var express = require("express");
var router = express.Router();
var Book = require("../models/book");
var User = require("../models/user");
var Transaction = require("../models/transaction");
var middleWare = require("../middleware");
var nodemailer = require("nodemailer");

var transporter = nodemailer.createTransport({
 service: 'gmail',
 auth: {
        user: process.env.EMAIL_LOGIN,
        pass: process.env.EMAIL_PASS
    }
});
//buy book route
router.post("/:id/buy", middleWare.isLoggedIn, function (req, res) {
    //update book to sold
    var buyerEmail;
    Book.findById(req.params.id, function (err, foundBook) {
       if(err) {
           req.flash("error", "Cannot find the book you're trying to buy");
           res.redirect("/books");
       } else {
           //mark book as sold
           foundBook.sold = true;
           foundBook.save();
           //create the new transaction
           var transaction = new Transaction ({
               buyer: {
                   id: req.user._id,
                   username: req.user.username
               },
               seller: {
                   id: foundBook.author.id,
                   username: foundBook.author.username
               },
               book: {
                   id: foundBook._id,
                   name: foundBook.name
               }
           });
           transaction.save();
           // add book to buyer
           User.findById(req.user._id, function (err, buyer) {
               if(err) {
                   req.flash("error", "Error finding user during transaction");
                   return res.redirect("/books");
               }
               buyerEmail = buyer.username;
               buyer.transactions.push(transaction);
               buyer.save();
           });
           //and seller transactions
           User.findById(foundBook.author.id, async function (err, seller) {
              if(err) {
                  req.flash("error", "Error finding user during transaction");
                  return res.redirect("/books");
              }
               seller.transactions.push(transaction); //pushes seller
               await seller.save(); //saves it to database
               //email the seller
               const mailOptions = {
                   from: 'calubookex@gmail.com',
                   to: seller.username,
                   subject: 'DONOTREPLY Your book ' + foundBook.name + ' has sold',
                   html: '<h1>You\'ve sold a book!</h1><p>Please check your <a href="http://calubookexchange.hopto.org/login">account</a> transactions and' +
                       ' contact the buyer (' + buyerEmail + ') to arrange payment.</p>'
               };
               //send the mail!
               await transporter.sendMail(mailOptions, function(error, info){
                   if (error) {
                       console.log(error);
                       res.redirect("/books");
                   } else {
                       req.flash("success", "Thank you for your purchase. The seller should be contacting you soon!");
                       res.redirect("/books");
                   }
               });
           });
       }
    });
});

module.exports = router;
