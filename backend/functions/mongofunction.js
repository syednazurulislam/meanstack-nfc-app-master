

//importing schema
const details = require('../model/mongoSchema/productdetails');
const registerusers = require('../model/mongoSchema/userdetails');

//importing multichain function's
const multichain = require('./multichain');
//importing epochtime function's
const ecpochtoist = require('./EPOCHtoIST');

var citynamearray=[];

const state={};





//when we scan the tag we will be finding whether it is exist in mongo or not 
function findproduct(data,status) {
    console.log(data+" mongo");
    var findThisId = { TagId: data }
    console.log(findThisId);
    return new Promise(function(resolve,reject){

 details.findOne(findThisId, function (err, products) {
        if (err) {
            res.json(err);
        } else {
            console.log("verifyed");
            console.log(products);
            if(products==null){
             mongodata="DataDoNotExist";
            }else{
             mongodata="DataExist";
            }
            //now same id-data is sent to the multichain.js to check its existence
            multichain.findasset(data,mongodata,status).then(result => {
                resolve(result);
            })


        }

    });
});
}



//this function will find the city name when we pass the address in parameters
function findcity(FindCity){
    console.log("im in find adddress "+FindCity);
    return new Promise(function(resolve,reject){
     
        registerusers.findOne( {$or:[{BlockChainReturnAddress:FindCity},{BlockChainValidAddress:FindCity}]}, function (err, addressDetails) {
               if (err) {
                   console.log(err)
                   reject(err);
               } else {
                   console.log("addressDetails");
                   console.log(addressDetails.BranchName);
                   resolve(addressDetails.BranchName);
               }
           });
            
        
      
       });
       
}



//we will recive transaction data from multichain and convert cityAddress to CityName and EpochTime to ISTTime
async function getTracking(data){
console.log(data);
var looper = 0;
var tracking = [];
while(data[looper]){
  var cityName = await findcity(data[looper].cityAddress);
console.log("im in loop "+cityName);
var ISTTime=ecpochtoist.epocihtoist(data[looper].time);
console.log("time "+ISTTime);
var trackingData = { cityname: cityName, time: ISTTime, transactionid: data[looper].transactionid }
tracking.push(trackingData);
looper++;
}
return tracking;
}



function findcitylike(input){
    console.log("im in find city like "+input);
    return new Promise(function(resolve,reject){

registerusers.find({BranchName:{'$regex': input}},{BranchName:1,BlockChainValidAddress:1,BlockChainReturnAddress:1,_id:0},function(err,citynameandaddress){
if(err){
    console.log(err)
    reject(err);
}else{
    console.log("citynameandaddress: "+citynameandaddress);
    resolve(citynameandaddress);
}
})
    })
}




// //this function is for all product of particular address
// function ProductsOnAddress(data){
//     return new Promise(function(resolve,reject){

// var address={parentAddress:{'$regex': data}}
//     details.find(address,{TagId:1,_id:0},function (err, products) {
//         if (err) {
//             res.json(err);
//         } else {
//             console.log(products);

//       resolve(products);
//         }

//     });
// })
// }




// module.exports.ProductsOnAddress = ProductsOnAddress;
/* module.exports.findproduct = findproduct;
module.exports.findcity = findcity;
module.exports.findcitylike = findcitylike;
module.exports.getTracking = getTracking; */

 module.exports={
findproduct,findcity,findcitylike,getTracking
 }
