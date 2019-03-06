module.exports = {
  makeVerificationCode: function() {
    var code = ""
    const codeLength = 6
    var possible = "0123456789"

    for (var i = 0; i < codeLength; i++){
      code += possible.charAt(Math.floor(Math.random() * codeLength));
    }
    return code;
  },
  calPrice: function (quantity, price, ammount){
        return Math.ceil(price * quantity / ammount * 100)/100
  },
  findProduct: function (products, name){
    for (var i = 0; i < products.length; i++){
      if(products[i].name == name){
        return products[i]
      }
    }
    return false
  },
  findProductPos: function (products, name) {
    var pos = -1
    for (var i = 0; i < products.length; i ++){
        if (products[i].name == name){
            pos = i
        }
    }
    return pos
  }
}