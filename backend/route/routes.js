var express = require('express');
const assert = require('assert');
var jwt = require('jsonwebtoken');
var route = express.Router();
var state = {};

//passportService = require('../config/passport');
passport = require('passport');
var requireAuth = passport.authenticate('jwt', { session: false }),
requireLogin = passport.authenticate('local', { session: false });
//importing schema
const details = require('../model/mongoSchema/productdetails');
const registerusers = require('../model/mongoSchema/userdetails');

//importing multichain function's
const multichain = require('../functions/multichain');

//importing encryption and decryption function
const encrypanddecrypt = require('../functions/Encryptanddecrypt');
//importing token.js page
const tokenpage = require('../functions/token');

//importing the mongo functions
const MongoDB = require('../functions/mongofunction');





//to feach the productdata..
route.post('/products', tokenpage.ensureToken, (req, res, next) => {
    console.log("in products");

    // jwt.verify(req.token,'')

    tokenpage.verify(req.token).then(verifyed => {
        console.log("this from the routes.js " + verifyed);
        if (verifyed != "forbidden") {
            details.find(function (err, products) {
                if (err) {
                    res.json(err);
                } else {

                    console.log(verifyed);
                    console.log(products);

                    res.json(verifyed.data.BlockChainValidAddress);

                }

            });
        } else {
            res.sendStatus(403);
        }
    })
});








//to insert the productdata
route.post('/insertproductdata', tokenpage.ensureToken, (req, res, next) => {
    tokenpage.verify(req.token).then(verifyed => {
        if (verifyed != "forbidden") {
            console.log("in post method");
            console.log(req.body);
            multichain.CreateAsset(req.body, verifyed.data.BlockChainValidAddress).then(output => {
                if (output == "subscribe") {
                    let newproductdetails = new details({
                        TagId: req.body.tagid,
                        BarCodeData: req.body.barcodedata,
                        TagData: req.body.tagdata,
                        ProductDetails: req.body.productdetails,
                        parentAddress: verifyed.data.BlockChainValidAddress
                    })
                    newproductdetails.save((err, newproductdetails) => {
                        if (err) {
                            res.json(err);
                        } else {
                            res.json("item has added to the database");
                        }
                    });
                } else {
                    res.json(output)
                }
            })
        } else {
            res.sendStatus(403);
        }
    })
});



//to insert the userdetails in mongodb and creating the 3 new address in multichain
route.post('/userregister', (req, res, next) => {
    console.log("in post method userregister");
    console.log(req.body);
    //the "multichain.getThreeAddress()" will return 3 address from multichain.js page 
    multichain.getThreeAddress().then(data => {
        //the promise will return as "data" which contain the 3 address
        console.log(data);
        //encryping the password(for reference go to './route/encryptanddecrypt.js')
        encrypanddecrypt.encrypt(req.body.password).then(encryptedpassword => {
            console.log("this is encryp password " + encryptedpassword);
            //setting all varibales for mongo schema
            let newuserdetails = new registerusers({
                UserName: req.body.username,
                BranchName: req.body.branchname,
                Email: req.body.mailid,
                PhoneNumber: req.body.phonenumber,
                Password: encryptedpassword,
                BlockChainValidAddress: data.BlockChainValidAddress,
                BlockChainReturnAddress: data.BlockChainReturnAddress,
                BlockChainDeliveryAddress: data.BlockChainDeliveryAddress
            })
            //by using the mongoose save methode we are saving the data into mongo-db
            newuserdetails.save((err, newuserdetails) => {
                if (err) {
                    res.json(err);
                } else {
                    console.log("userdetails has added to the database");
                    res.json("inserted")
                }
            });
        })
    }, (err) => { console.log(err) })
});




//code to user login

route.post('/userlogin', (req, res, next) => {
    console.log("im in userlogin " + JSON.stringify(req.body));
    registerusers.findOne({ PhoneNumber: req.body.phonenumber }, function (err, user) {
        if (err) {
            res.json(err);
        } else {
            if (user != null) {

                var password = { "encryptpassword": user.Password, "requestedpassword": req.body.password }
                //decryp the user.password and comparing it with the req.body.password
                encrypanddecrypt.decrypt(password).then(result => {
                    if (result) {
                        var setToken = tokenpage.Newtoken(user);
                        console.log(setToken);


                        res.status(200).json({
                            status: '200',
                            token: 'jwt ' + setToken,
                            username: user.UserName,
                            branchname:user.BranchName

                        });


                    } else {
                        console.log("password is invald");
                        res.json("password is invald");
                    }

                })
            } else {
                res.json("this number is not get register");
            }
        }

    });

});





//this function will find the tagid/product is present in multichain/mongo and tamper or not when tag is scaned
route.post('/AuthourisedUserTagscan',tokenpage.ensureToken,(req, res, next) => {
    tokenpage.verify(req.token).then(verifyed => {
        if (verifyed != "forbidden") {
    console.log(req.body.tagdata);
    if (req.body.tagdata == "SECURED") {
        state.status = "SECURED";
    } else {
        state.status = "Tamper";
        //if the status is tamper we will auto-send the asset from valid-address to return-address
        var transferinfo = { fromAddress: verifyed.data.BlockChainValidAddress, toAddress: verifyed.data.BlockChainReturnAddress, tagID: req.body.Tagid };
        multichain.assettransfer(transferinfo).then(transactionID => {
            console.log(transactionID);
           
        })
    }
    MongoDB.findproduct(req.body.Tagid, state.status).then(result => {
        console.log(result + " this end result");
        res.json(result);
    })
} else {
    res.sendStatus(403);
}
})
});



//this function will track the asset transaction 
route.post('/tracking',tokenpage.ensureToken, (req, res, next) => {

    console.log(req.body);
    tokenpage.verify(req.token).then(verifyed=>{
        if(verifyed !="forbidden"){
            multichain.getAssetTransactions(req.body.tagid).then(transactions => {
                //now we will send the transaction data to mongo function page to convert cityAddress to CityName and EpochTime to ISTTime
                MongoDB.getTracking(transactions).then(trackingdata => {
                    console.log(trackingdata);
                    res.json(trackingdata)
                })
            })
        }else{
            res.sendStatus(403);
        }
    })
   
})




//this function get the asset info from multichain
route.post('/assetdetails', (req, res, next) => {
    console.log(req.body.tagid);
    multichain.assetdetails(req.body.tagid).then(assetDetails => {
        console.log(assetDetails);
        res.json(assetDetails)
    })
})








//this function transfer the asset from one address to other address
route.post('/assettransfer', tokenpage.ensureToken, (req, res, next) => {
    tokenpage.verify(req.token).then(verifyed => {
        var FromAddress;
        console.log("this from the routes.js " + JSON.stringify(verifyed.data.BlockChainValidAddress));
        if (verifyed != "forbidden") {
            if(req.body.requestFrom=="validaddress"){
                FromAddress=verifyed.data.BlockChainValidAddress;
            }else{
             FromAddress=verifyed.data.BlockChainReturnAddress;
            }
            var transferinfo = {fromAddress: FromAddress, toAddress: req.body.toaddress, tagID: req.body.tagid };
            multichain.assettransfer(transferinfo).then(transactionID =>{
                console.log(transactionID);
                res.json(transactionID);
            })
            } else {
            res.sendStatus(403);
        }
    })
})



//this function will retrive the address and city from the mongo db
route.post('/findcitylike', (req, res, next) => {
    console.log(req.body.query);
    MongoDB.findcitylike(req.body.query).then(result => {
        console.log(result);
        res.status(200).json(result);
    })
})



//this function will display the userdetails
route.post('/userdetails', tokenpage.ensureToken, (req, res, next) => {
    console.log("im in userdetails");
    tokenpage.verify(req.token).then(verifyed => {
        if (verifyed != "forbidden") {
            res.json(verifyed.data);
        } else {
            res.sendStatus(403);
        }

    })
})


//this function is to get all asset  whice are sent and resived on the requested address,
route.post('/alltransaction', tokenpage.ensureToken, (req, res, next) => {
    console.log("im in alltransation");
    tokenpage.verify(req.token).then(verifyed => {
        if (verifyed != "forbidden") {
            multichain.productListAddressTransactions(verifyed.data.BlockChainValidAddress).then(product => {
                res.json(product)
            })
        } else {
            res.sendStatus(403);
        }
    })
})





//this function will fetch all asset present in requested address
route.post('/assetsonaddress', tokenpage.ensureToken, (req, res, next) => {
    console.log("in assetsonaddress")
    tokenpage.verify(req.token).then(verifyed => {
        var Address;
        if (verifyed != "forbidden") {
            if(req.body.requestFrom == "validaddress"){
            Address=verifyed.data.BlockChainValidAddress;
            }else if(req.body.requestFrom == "returnaddress"){
            Address=verifyed.data.BlockChainReturnAddress;             ;
            }
            console.log(Address);
            multichain.myAssets(Address).then(list => {
                console.log("this is from the routes.js page " + JSON.stringify(list));
                res.json(list)
            })
        } else {
            res.sendStatus(403);
        }
    })
})
//to find the asset which pass through this address
route.post('/knowtransaction',tokenpage.ensureToken,(req,res,next)=>{
    console.log("i am in know transactions");
    tokenpage.verify(req.token).then(verifyed=>{
        var Address;
        if(verifyed !="forbidden"){
            Address=verifyed.data.BlockChainValidAddress;

       
        console.log(Address);
        multichain.knowaddresstransactions(Address).then(list=>{
            console.log(list +"list in rote.js");
            res.json(list);
        })
    }else{
        res.sendStatus(403);
    }  
    })
    
})

//to find total asset in the multichain
route.post('/TotalBlockchainAsset', (req, res, next) => {
    
    multichain.TotalProduct().then(result=>{
        console.log(result.length);
        res.json(result.length);
    })
})

//to find non-tamper product in blockchain
route.post('/TotalNonTamperBlockchainAsset', (req, res, next) => {
    MongoDB.FindTheNonTamperAddress().then(result=>{
        console.log(result);
        state.result=result;
        var counter=0;
        var nonTamperProduct=0;
        
       if(result){
           while(state.result[counter]){
            console.log("count="+counter);

            multichain.myAssets(state.result[counter].BlockChainValidAddress).then(list => {
                console.log("this is from the routes.js page " + JSON.stringify(list));
                nonTamperProduct=nonTamperProduct+list.length;
                // console.log(nonTamperProduct+"on address"+result[counter].BlockChainValidAddress);   
                console.log(state.result.length);
                
               
            })
           
             counter++;

             if(counter == state.result.length-1) {
                console.log("in if cond");
                res.json(nonTamperProduct)
            }
           }
            // res.json(nonTamperProduct)
       }

    })
})

module.exports = route;