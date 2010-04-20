//STRING METHODS
String.prototype.trim=function(){
   return(this.replace(/^\s+|\s+$/g,""));
};
String.prototype.dir=function(){
	return(this.replace(/\/[^\/]*?$/g,""));
};
String.prototype.stripExtension=function(){
	return(this.replace(/\.[^\.]*?$/g,""));
};
String.prototype.basename=function(){
	var a=this.split("/");
	return a.pop();
};
String.prototype.ccSplit=function(capitalize){//camelCasing >> [camel,casing]
	var output=[""];
	var split=this.trim().split(/([A-Z\z])/);
	for(var i=0;i<split.length;i++){
		var n=String(split[i]);
		if(i/2==Math.ceil(i/2)){
			if(n.length){
				output[i/2]+=(
					capitalize && i===0 ?
					n[0].toUpperCase():
					n[0].toLowerCase()
				)+n.slice(1);
			}
		}else{
			output[Math.ceil(i/2)]=(
				capitalize ?
				n.toUpperCase():
				n.toLowerCase()
			);
		}
	}
	return output;
};
String.prototype.camelCase=function(capitalize){
	var a=new dx.Array(this.split(/[^A-Za-z\d_\$]/g));
	a=a.remove('');
	return a.ccJoin(capitalize);
}
