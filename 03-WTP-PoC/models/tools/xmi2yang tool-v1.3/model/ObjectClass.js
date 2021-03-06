/********************************************************************************************************
 * Name: UML to YANG Mapping Tool
 * Copyright 2015 CAICT (China Academy of Information and Communication Technology (former China Academy of Telecommunication Research)). All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License").
 *
 * This tool is developed according to the mapping rules defined in onf2015.261_Mapping_Gdls_UML-YANG.08 by OpenNetworkFoundation(ONF) IMP group.
 *
 * file: \model\ObjectClass.js
 *
 * The above copyright information should be included in all distribution, reproduction or derivative works of this software.
 *
 ****************************************************************************************************/
var Type=require("./yang/type.js");
var Attribute=require("./OwnedAttribute.js");

var tool = (new Array(11).join(' ') + 'uml2yang').slice(-10);
var log = function(level, message) {
  var time = new Date().toISOString();
  var out = [time, tool, level, message].join(' | ');
  console.log(out);
};

function Class(name,id,type,comment,nodeType,path,config,isOrdered){
    this.name=name;
    this.id=id;
    this.type=type;
    this.path=path;
    this.nodeType=nodeType;
    // if (this.name.indexOf('MW_') !== -1) console.info('[sko]', 'Class', this.name, this.type, this.nodeType);
    if (comment) this.description=comment.toYangDescription();
    this.Gname;
    this.support;
    this.status;
    this.generalization=[];
    this.instancePath="";
    this.isGrouping=false;
    this.isAbstract=false;//"class" is abstract
    this.config=config;
    this.isOrdered=isOrdered;
    this.association;
    this.attribute=[];
    this.key=[];
}
Class.prototype.isEnum=function(){
    var result;
    this.type=="Enumeration"?result=true:result=false;
    return result;
};
Class.prototype.buildEnum=function(obj){
    var node=new Type("enumeration");
    var literal=obj["ownedLiteral"];
    // console.info('[sko]', obj);
    if (literal) {
    if(literal.array){
        // More than one enumerated value
        for(var i=0;i<literal.array.length;i++){
            node.children.push("enum "+literal.array[i].attributes().name);
        }
    }else{
        // Single enumerated value
        node.children.push("enum " + literal.attributes().name);
    }
    } else {
      // console.info('[sko]', obj);
      node.children.push("enum " + '[sko] currenly generalization for enums not implemented!');
      
    }
    this.attribute.push(node);
};
Class.prototype.buildAttribute=function(att){
    var id = att.attributes()['xmi:id'];
    var name;
    att.attributes().name?name=att.attributes().name:console.log("ERROR:The attribute 'name' of tag 'xmi:id="+att.attributes()["xmi:id"]+"' in this file is empty!");
    name=name.replace(/^[^A-Za-z|_]+|[^A-Za-z|_\d]+$/g,"");
    name=name.replace(/[^\w]+/g,'_');
    var comment;
    if(att['ownedComment']){
        if(att['ownedComment'].array){
            comment="";
            comment+=att['ownedComment'].array[0].body.text();
            for(var i=1;i<att['ownedComment'].array.length;i++){
                if(att['ownedComment'].array[i].body.hasOwnProperty("text")){
                    comment+="\r\n"+att['ownedComment'].array[i].body.text();
                }
            }
        }else if(att['ownedComment'].body){
            comment = att['ownedComment'].body.text();
        }else{
            log('INFO ', "The comment of Class "+att.attributes().name+" is undefined!")
        }
    }
    var association;
    att.attributes().association ? association = att.attributes().association : association=null;
    var isReadOnly;
    att.attributes().isReadOnly ? isReadOnly =att.attributes().isReadOnly : isReadOnly = false;
    var isOrdered;
    att.attributes().isOrdered ? isOrdered =att.attributes().isOrdered : isOrdered = false;
    var type;
    var isLeaf;
    if(att.attributes().type){
        type = att.attributes().type;
        isLeaf=false;
    }
    else if(att['type']){
        type =att['type'].attributes();
        if (type['xmi:type'] == 'uml:PrimitiveType') {
            type =type.href.split('#')[1].toLocaleLowerCase() ;
            isLeaf=true;
        }else if(type['xmi:type'] =="uml:Class"||type['xmi:type'] =="uml:DataType"||type['xmi:type'] =="uml:Enumeration"){
            type =type.href.split('#')[1];
            isLeaf=false;
        }
        else {
            type = type.href;
        }
    }
    else{
        log('WARN ', "The type of attribute 'xmi:id="+id+"' is undefined!");
        type="string";
        isLeaf=true;
    }
    var attribute=new Attribute(id, name,type, comment, association, isReadOnly,isOrdered);//build a attribute
    // console.info('[sko]', '>>attribute', id, name, type, attribute.isleafRef);
    if(att.attributes().aggregation&&att.attributes().aggregation=="composite"){
        attribute.isleafRef=false;
    }
    // [sko] hack, better make aggregation in UML composite
//    if (attribute.name === 'airInterfaceCurrentProblemList') {
//      attribute.isleafRef=false;
//    }
    // console.info('[sko]', '<<attribute', id, name, type, attribute.isleafRef);
    attribute.giveValue(att);
    attribute.giveUnits(att);
    attribute.giveNodeType(isLeaf);
    this.attribute.push(attribute);
    var r=attribute.returnType();
    return r;
};
Class.prototype.buildGeneral=function(gen){
    var obj;
    if(gen.attributes().general){
        obj = gen.attributes().general;
    }else{
        // console.info('[sko]', gen);
        obj = gen.general.attributes().href.split("#")[1];
    }
    this.generalization.push(obj);
};
Class.prototype.buildOperate=function(para){
    var arr=[];
    var type;
    var isLeaf;
    var nodeType;
    var id;
    var input=[];
    var output=[];
    var id =para.attributes()['xmi:id'];
    var name = para.attributes().name;
    if(para.attributes().type){
        type = para.attributes().type;
        isLeaf=false;
    }else if(para['type']){
        type =para['type'].attributes();
        isLeaf=true;
        if (type['xmi:type'] == 'uml:PrimitiveType') {
            type =type.href.split('#')[1].toLocaleLowerCase() ;
        } else {
            type = type.href;
        }
    }
    else{
        type="string";
        isLeaf=true;
    }
    var comment;
    para['ownedComment'] ? comment = att['ownedComment'].body.text() : comment = null;
    var association;
    para.attributes().association ? association = para.attributes().association : association=null;
    var isReadOnly;
    para.attributes().isReadOnly ? isReadOnly =para.attributes().isReadOnly : isReadOnly = false;
    var isOrdered;
    para.attributes().isOrdered ? isOrdered =para.attributes().isOrdered : isOrdered = false;
    var parameter=new Attribute(id, name,type, comment, association, isReadOnly,isOrdered);
    parameter.giveValue(para);
    parameter.giveUnits(para);
    parameter.giveNodeType(isLeaf);
    var r=parameter.returnType();
    if(para.attributes().direction=="out"){
        parameter.rpcType="output";
    }else{
        parameter.rpcType="input";
    }
    this.attribute.push(parameter);
    return r;
};
module.exports=Class;
