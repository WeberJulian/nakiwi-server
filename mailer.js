const nodemailer = require('nodemailer')
const mailBuilder = require('./mailBuilder')

module.exports = {
  sendMail: async function (to, subject, message){
    var transporter = nodemailer.createTransport({
        host: 'smtp.office365.com', // Office 365 server
        port: 587,     // secure SMTP
        secure: false, // false for TLS - as a boolean not string - but the default is false so just remove this completely
        auth: {
            user: process.env.EMAIL,
            pass: process.env.EMAIL_PASS
        },
        tls: {
            ciphers: 'SSLv3'
        }
    });
    
    let mailOptions = {
        from: process.env.EMAIL, // sender address
        to: to, // list of receivers
        subject: subject, // Subject line
        text: message // plain text body
    };
    
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            return console.log(error);
        }
        console.log('Message sent: %s', info.messageId);
    });
  },
  sendConfirmationCode: async function (to, code){
    var transporter = nodemailer.createTransport({
        host: 'smtp.office365.com', // Office 365 server
        port: 587,     // secure SMTP
        secure: false, // false for TLS - as a boolean not string - but the default is false so just remove this completely
        auth: {
            user: process.env.EMAIL,
            pass: process.env.EMAIL_PASS
        },
        tls: {
            ciphers: 'SSLv3'
        }
    });
    
    let mailOptions = {
        from: process.env.EMAIL, // sender address
        to: to, // list of receivers
        subject: "Your Nakiwi Verification code !", // Subject line
        html: mailBuilder.confirmationCode(code)
    };
    
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            return console.log(error);
        }
        console.log('Confirmation sent to : ' + to);
    });
  },
  sendOrderConfirmation: async function (to, order){
    var transporter = nodemailer.createTransport({
        host: 'smtp.office365.com', // Office 365 server
        port: 587,     // secure SMTP
        secure: false, // false for TLS - as a boolean not string - but the default is false so just remove this completely
        auth: {
            user: process.env.EMAIL,
            pass: process.env.EMAIL_PASS
        },
        tls: {
            ciphers: 'SSLv3'
        }
    });
    
    let mailOptions = {
        from: process.env.EMAIL, // sender address
        to: to, // list of receivers
        subject: "Your nakiwi order confirmation !", // Subject line
        html: mailBuilder.validation(order)
    };
    
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            return console.log(error);
        }
        console.log('Validation sent to : ' + to);
    });
  }
}