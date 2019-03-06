const mongodb = require('mongodb');
const bcrypt = require('bcryptjs');
const UIDGenerator = require('uid-generator');
const tools = require('./tools.js');
const mailer = require('./mailer.js');
const page = require('./pageBuilder');
const validator = require('./validator.js');
const stripe = require("stripe")(process.env.STRIPE_SK);

var uri = 'mongodb://'+process.env.USER+':'+process.env.PASS+'@'+process.env.HOST+':'+process.env.PORT+'/'+process.env.DB;

const uidgen = new UIDGenerator();
const min = 1000 * 60;
var tokenValidity = min * 3000;

const Logger = require("./logger.js")("./logs.txt");

module.exports = {
  
  
  //AUTHENTIFICATION
  
  
  register : async function (user) { //Check user before entering the function
    if (!validator.emailValidation(user.email)) return 'EMAIL_NOT_VALID'
    user.email = user.email.toLowerCase()
    console.log("Registration of : " + user.email)
    const code = tools.makeVerificationCode()
    var status = ''
    var err, db = await mongodb.MongoClient.connect(uri);
    if(err) throw err;
    var users =  await db.collection('users');
    var monReq = {email: user.email}
    var err, result = await users.count(monReq);
    if(err) throw err;
    
    if(result == 0){
      var dbUser = {
        email: user.email,
        name: user.name, //Add RegEx check
        surname: user.surname, //Add RegEx check
        orders: [],
        cus: "",
        confirmation : {
          code: code,
          issued: Date.now(),
          status: 'pending'
        }
      }
      var salt = await bcrypt.genSalt(10);
      dbUser.password = await bcrypt.hash(user.password, salt);
      await users.insert(dbUser, function(err) {if(err) throw err;});
      mailer.sendConfirmationCode(user.email, code)
      console.log("code : " + code)
      status = "OK";
    }
    else {
      var dbUser = await users.findOne(monReq)
      if (dbUser.confirmation.status == "pending"){
        await users.remove(monReq)
        var dbUser = {
            email: user.email, //Add RegEx check
            name: user.name, //Add RegEx check
            surname: user.surname, //Add RegEx check
            orders: [],
            cus: "",
            confirmation : {
              code: code,
              issued: Date.now(),
              status: 'pending'
            }
        }
        var salt = await bcrypt.genSalt(10);
        dbUser.password = await bcrypt.hash(user.password, salt);
        await users.insert(dbUser, function(err) {if(err) throw err;});
        mailer.sendConfirmationCode(user.email, code)
        console.log("code : " + code)
        status = "OK";
      }
      else{
        status = "EMAIL_ALREADY_IN_USE";
      }
    }    
    db.close();
    console.log(status)
    return status
  },
  
  validateAccount: async (user) => {
    if (!validator.emailValidation(user.email)) return 'EMAIL_NOT_VALID'
    user.email = user.email.toLowerCase()
    console.log("Verification of : " + user.email)
    var err, db = await mongodb.MongoClient.connect(uri);
    if(err) throw err;
    var users =  await db.collection('users');
    var monReq = {email: user.email}
    var result = await users.findOne(monReq);   
    if(!result) status = 'WRONG_EMAIL';

    
    else if(result.confirmation.status == 'pending'){
      if (result.confirmation.code == user.code){
        var res, err = await users.findAndModify({email: user.email}, [['_id','asc']], {"$set" : {"confirmation.status": "ok"}}) 
        status = "OK";
      }
      else{
        status = "WRONG_CODE"
      }
    }
    else{
      status = "ACCOUNT_ALREADY_ACTIVATED";
    }
    db.close();
    console.log(status)
    return status
  },  
  
  login: async (user) => {
    if (!validator.emailValidation(user.email)) return 'EMAIL_NOT_VALID'
    user.email = user.email.toLowerCase()
    console.log(user.email)
    var res = {
      status: '',
      token: ''
    };
    var err, db = await mongodb.MongoClient.connect(uri);
    if(err) throw err;
    var users =  await db.collection('users');
    
    var monReq = {email: user.email}
    var err, result = await users.count(monReq);
    
    if (result == 0) {
      res.status = 'NOT_FOUND'
    }
    else{
      var dbUser = await users.findOne(monReq);
      if (await bcrypt.compareSync(user.password, dbUser.password)){
        if (dbUser.confirmation.status == 'ok'){
          var token = await uidgen.generate();
          monReq = {_id: dbUser._id}
          var monReq2 = {$set: {
            token: {
              last: token,
              issued: Date.now()
            }}}
          users.update(monReq, monReq2)
          res.status = 'LOGGED_IN';
          res.token = token
        }
        else{
          res.status = "ACCOUNT_NOT_ACTIVATED"
        }
        
      }
      else{
        res.status = "WRONG_PASSWORD"
      }
    }
    db.close();
    console.log(res.status)
    return res
  },
  
  auth: async function (user){
    if (!validator.emailValidation(user.email)) return 'EMAIL_NOT_VALID'
    user.email = user.email.toLowerCase()
    console.log(user.email)
    var status = ''
    var err, db = await mongodb.MongoClient.connect(uri);
    if(err) throw err;
    var users =  await db.collection('users');
    
    var monReq = {email: user.email}
    var err, result = await users.count(monReq);
    
    if (result == 0) {
      status = 'NOT_FOUND'
    }
    else{
      var dbUser = await users.findOne(monReq);
      if (dbUser.token.last == user.token){
        if (dbUser.token.issued + tokenValidity > Date.now()){
          status = 'VALID_TOKEN';
        }
        else
        {
          status = 'EXPIRED_TOKEN';
        }
      }
      else{
        status = 'WRONG_TOKEN';
      }
    }
    db.close();
    console.log(status)
    return status
  },
  
  
  //PAYMENT
  
    
  pay: async (body) => {
    console.log("payment : " + body.email)
    var auth = await module.exports.auth({
      email: body.email,
      token: body.token
    })
    if(auth == "VALID_TOKEN"){
      
      
      var err, db = await mongodb.MongoClient.connect(uri);
      if(err) throw err;
      var users =  await db.collection('users');
      var monReq = {email: body.email.toLowerCase()}
      var dbUser = await users.findOne(monReq);
      var result = await module.exports.calTotal({basket: body.basket, listInfo: body.listInfo._id, payment: true, code: body.code, email: body.email.toLowerCase(), delivery: body.delivery})
      
      const amount = result.total
      console.log("ammount " + amount)
      const customer = dbUser.cus
      const card = body.card.id
      try{
        var charge = await stripe.charges.create({
          amount: Math.ceil(amount * 100),
          currency: "gbp",
          card: card,
          customer: customer,
          description: "Charge for " + body.email
        })
        module.exports.updateProductMax({basket: body.basket, listInfo: body.listInfo._id})
      }
      catch(err){
        console.log(err)
        return { status: "TRANSACTION_FAILED"}
      }
      
      
      if (charge && charge.paid){
        var order = {
          date: Date.now(),
          email: body.email,
          charge: charge.id,
          ammount: amount,
          card: body.card,
          delivery: body.delivery,
          cus: customer,
          code: body.code,
          currency: "gbp",
          basket: body.basket
        }
        var orders =  await db.collection('orders');
        var err, docsInserted = await orders.insert(order)
        var monReq2 = { $push: { orders: docsInserted.ops[0]._id} }
        var err = await users.update(monReq, monReq2)
        mailer.sendOrderConfirmation(body.email, order)
        return { status: "OK"}
      }
      else {
        if(charge.failure_message){
          return { status: charge.failure_message}
        
        }
        else{
          return { status: "TRANSACTION_FAILED"}
        }
      }
    }
    return auth
  },
  
 handlePromo: async (ammount, code, payment, email, delivery) => {
	if (code) {
		code = code.toUpperCase();
	}
	if (email) {
		email = email.toLowerCase();
	}
	var result = {};
	if (code != '' && code) {
		var err,
			db = await mongodb.MongoClient.connect(uri);
		if (err) throw err;
		var promo = await db.collection('promo');
		var monReq = { code: code };
		var dbCode = await promo.findOne(monReq);
		if (dbCode) {
			if (dbCode.type == 'promoCodeLimited') {
				if (dbCode.used <= dbCode.max) {
					if (ammount >= 10) {
						result.reduction = 4;
						result.status = 'OK';
						if (payment) {
							promo.update(monReq, { $inc: { used: 1 } });
						}
					} else {
						result.reduction = 0;
						result.status = 'you need to buy at least 10£ to use this code';
					}
				} else {
					result.reduction = 0;
					result.status = 'this code has been used up';
				}
			} else if (dbCode.type == 'ambassador') {
				if (dbCode.ambassador == email) {
					if (dbCode.used > dbCode.personalUse) {
						if (payment) {
							promo.update(monReq, { $inc: { personalUse: 1 } });
						}
						result.reduction = ammount * dbCode.reduction / 100;
						result.status = 'OK';
					} else {
						result.reduction = 0;
						result.status = 'NOT_ENOUGH_CREDIT';
					}
				} else {
					if (dbCode.users.includes(email)) {
						result.reduction = 0;
						result.status = 'ALREADY_USE_CODE';
					} else {
						if (payment) {
							promo.update(monReq, { $push: { users: email } });
							promo.update(monReq, { $inc: { used: 1 } });
						}
						result.reduction = ammount * dbCode.reduction / 100;
						result.status = 'OK';
					}
				}
			} else if (dbCode.type == 'event') {
				if (delivery != undefined && dbCode.delivery == delivery._id) {
					promo.update(monReq, { $inc: { used: 1 } });
					result.reduction = ammount * dbCode.reduction / 100;
					result.status = 'OK';
				} else {
					result.reduction = 0;
					result.status = 'This code is not available for this delivery';
				}
			}
		} else {
			result.reduction = 0;
			result.status = 'invalid code';
		}
	} else {
		result.reduction = 0;
		result.status = 'no code';
	}
	return result;
},

  
  addCard: async (body) => {
    console.log("add card : " + body.email)
    var auth = await module.exports.auth({
      email: body.email,
      token: body.token
    })
    if(auth == "VALID_TOKEN"){
      var err, db = await mongodb.MongoClient.connect(uri);
      if(err) throw err;
      var users =  await db.collection('users');
      var monReq = {email: body.email.toLowerCase()}
      var dbUser = await users.findOne(monReq);
      if(dbUser.cus == ""){
        var customer = await stripe.customers.create({
          description: "Customer for " + body.email,
          source: body.source
        })
        monReq = {_id: dbUser._id}
        var monReq2 = {$set: {cus: customer.id}}
        users.update(monReq, monReq2)
        return {status: "CARD_ADDED"}
      }
      else{
        var card = await stripe.customers.createSource(
          dbUser.cus,
          { source: body.source }
        )
        return {status: "CARD_ADDED"}
      }
    }
    else{
      return {status: auth}
    }
  },
  
  getCus: async (body) => {
    var auth = await module.exports.auth({
      email: body.email,
      token: body.token
    })
    if(auth == "VALID_TOKEN"){
      var err, db = await mongodb.MongoClient.connect(uri);
      if(err) throw err;
      var users =  await db.collection('users');
      var monReq = {email: body.email.toLowerCase()}
      var dbUser = await users.findOne(monReq);
      if(dbUser.cus == ""){
        return {status: "NO_CARDS"}
      }
      else{
        var cards = await stripe.customers.listCards(
          dbUser.cus
        )
        return { status: "OK", cards: cards.data }
      }
    }
    else{
      return {status: auth}
    }
  },
  
  getCards: async (body) => {
    console.log("getcards")
    var auth = await module.exports.auth({
      email: body.email,
      token: body.token
    })
    if(auth == "VALID_TOKEN"){
      var err, db = await mongodb.MongoClient.connect(uri);
      if(err) throw err;
      var users =  await db.collection('users');
      var monReq = {email: body.email.toLowerCase()}
      var dbUser = await users.findOne(monReq);
      if(dbUser.cus == ""){
        return {status: "NO_CARDS"}
      }
      else{
        var cards = await stripe.customers.listCards(
          dbUser.cus
        )
        return { status: "OK", cards: cards.data }
      }
    }
    else{
      return {status: auth}
    }
  },
  
  getOrders: async (body) => {
    var auth = await module.exports.auth({
      email: body.email,
      token: body.token
    })
    if(auth == "VALID_TOKEN"){
      var err, db = await mongodb.MongoClient.connect(uri);
      if(err) throw err;
      var users =  await db.collection('users');
      var monReq = {email: body.email.toLowerCase()}
      var dbOrder = await users.findOne(monReq);
      if(dbOrder.orders.length == 0){
        console.log("no orders")
        return {status: "NO_ORDERS"}
      }
      else{
        var orders =  await db.collection('orders');
        var monReq = { _id: { $in: dbOrder.orders }}
        var orders = await orders.find(monReq).toArray();
        orders = orders.sort((a, b) =>{ return b.date - a.date})
        return { status: "OK", orders: orders }
      }
    }
    else{
      return {status: auth}
    }
  },
  
  getProductListLegacy: async (body) => {
    const t0 = Date.now()
    var err, db = await mongodb.MongoClient.connect(uri);
    if(err) throw err;
    var products =  await db.collection('products');
    var productList = await products.findOne();
    return { stutus: "OK", products: productList, time: Date.now() - t0 }
  },
  
  getProductList: async (id) => {
    const t0 = Date.now()
    var err, db = await mongodb.MongoClient.connect(uri);
    if(err) throw err;
    var products =  await db.collection('products');
    var productList = await products.findOne({_id: new mongodb.ObjectID(id)});
    return { stutus: "OK", products: productList, time: Date.now() - t0 }
  },
  
  getDeliveries: async (body) => {
    var err, db = await mongodb.MongoClient.connect(uri);
    if(err) throw err;
    var deliveries =  await db.collection('deliveries');
    var deliveriesList = await deliveries.find({validity: {$gt: Date.now()}}).toArray();
    return { stutus: "OK", deliveries: deliveriesList }
  },
  
  updateProductMax: async (body) => {
    const basket = body.basket
    var err, db = await mongodb.MongoClient.connect(uri);
    if(err) throw err;
    var products =  await db.collection('products');
    var productList = await module.exports.getProductList(body.listInfo)
    
    for (var i = 0; i < basket.length; i++){
      var product = tools.findProduct(productList.products.products, basket[i].name)
      if (product.maxAmmount){
        console.log("Updating maxAmmount of : "  + product.name)
        var pos = tools.findProductPos(productList.products.products,  product.name)
        var tmp = productList.products.products[pos]
        tmp.maxAmmount = basket[i].maxAmmount - basket[i].quantity
        var result = await products.update({_id: new mongodb.ObjectID(body.listInfo)}, { $pull: { 'products': { name: product.name } }});
        var result = await products.update({_id: new mongodb.ObjectID(body.listInfo)}, { $push: {products : { $each: [ tmp ], $position: pos }}});
      }
    }
  },
  
  calTotal:  async (body) => {
    const basket = body.basket
    var err, db = await mongodb.MongoClient.connect(uri);
    if(err) throw err;
    var products =  await db.collection('products');
    var productList = await module.exports.getProductList(body.listInfo)
    var total = 0
    for (var i = 0; i < basket.length; i++){
      var product = tools.findProduct(productList.products.products, basket[i].name)
      if (product === false){
        return {status: "invalid product name"}
      }
      total += tools.calPrice(basket[i].quantity, product.price, product.ammount)
    }
    var promo = await module.exports.handlePromo(total, body.code, body.payment, body.email, body.delivery)
    console.log("total : " + Math.ceil((total - promo.reduction) * 100)/100)
    return {total: Math.ceil((total - promo.reduction) * 100)/100, status: promo.status}

  },
  
  listOrdersForDelivery: async (date) => {
    var err, db = await mongodb.MongoClient.connect(uri);
    if(err) throw err;
    var orders =  await db.collection('orders');
    if (date) {
      var ordersList = await orders.find({"delivery.date": date}).toArray();
    }
    else{
      var ordersList = await orders.find({"delivery.date": "3 December"}).toArray();
    }
    return { status: "OK", orders: ordersList }
  },
  
  getOrder: async (id) => {
    var err, db = await mongodb.MongoClient.connect(uri);
    if(err) throw err;
    var orders =  await db.collection('orders');
    var order= await orders.findOne({_id: new mongodb.ObjectID(id)})
    return page.buildOrder(order) 
  },
  
  listProductsWeHaveToOrder: async (date) => {
    var err, db = await mongodb.MongoClient.connect(uri);
    if(err) throw err;
    var orders =  await db.collection('orders');
    if (date) {
      var ordersList = await orders.find({"delivery.date": date}).toArray();
    }
    else{
      var ordersList = await orders.find({"delivery.date": "3 December"}).toArray();
    }
    var products = []
    for (var i = 0; i < ordersList.length; i++){
        var product
        for (var j = 0; j < ordersList[i].basket.length; j++){
            product = ordersList[i].basket[j]
            var pos = tools.findProductPos(products,  product.name)
            if(pos == -1){
                products.push({ name: product.name, displayName: product.displayName, quantity: product.quantity, unit: product.unit, ammount: product.ammount })
            }
            else{
                products[pos].quantity += product.quantity
            }
        }
    }
    return page.buildListProductsWeHaveToOrder(products) 
  }
}