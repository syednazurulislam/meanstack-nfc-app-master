var mongoose= require('mongoose');
const productdetailsschema=mongoose.Schema({
  
  TagId:{
    type:String,
    require:true
  },
  BarCodeData:{
    type:String,
    require:true
  },
  TagData:{
    type:String,
    require:true
  },
  ProductDetails:{
    type:String,
    require:true
  },
  parentAddress:{
  type:String,
  require:true
}

});

const details=module.exports=mongoose.model('details', productdetailsschema);