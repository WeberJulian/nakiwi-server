module.exports = {
  buildOrder: function (order){
    var result = header
    result += "Email : " + order.email 
    result += "<br>Ammount : " + order.ammount
    var event = new Date(order.date);
    result += "<br>Ordered : " + event.toLocaleString('en-GB', { timeZone: 'UTC' })
    result += "<br>For : " + order.delivery.date
    result += '</p><table style="width:100%"><tr><th>Products</th><th>Ammount</th><th>Unit</th></tr>'
    for (var i = 0; i < order.basket.length; i++){
      result += "<tr><td>" + order.basket[i].displayName + "</td><td>" + order.basket[i].ammount + "</td><td>" + order.basket[i].unit + "</td></tr>"
    }
    result += "</table></body></html>"
    return result
  },
  buildListProductsWeHaveToOrder: function (orders){
      var result = header2
      result += '</p><ul>'
      for (var i = 0; i < orders.length; i++){
        result += "<li>" + orders[i].displayName + " " + orders[i].quantity + " (" + orders[i].ammount + " " + orders[i].unit + ")</li>"
      }
      result += "</ul></body></html>"
      return result
  }
}



const header = `<!DOCTYPE html>
<html>
<head>
<style>
table, th, td {
    border: 1px solid black;
    border-collapse: collapse;
}
th, td {
    padding: 5px;
    text-align: center;    
}
</style>
</head>
<body>

<h2>Order</h2>
<p>`

const header2 = `<!DOCTYPE html>
<html>
<body>
<p>`