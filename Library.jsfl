(function(dx){
	function ExtensibleLibrary(lib,options){
		if(lib && lib.constructor.name=='Library'){
			this.$=lib;
		}else if(lib && lib['type'] && lib.type==this.type){
			this.$=lib.$;
			dx.Object.apply(this,lib);
		}else{
			this.$=new Library();
		}
		dx.Object.apply(this,[options]);
		return this;
	}
	ExtensibleLibrary.prototype={
		__proto__:dx.Object.prototype,
		type:ExtensibleLibrary
	}
	dx.extend({Library:ExtensibleLibrary});
})(dx)
