(function(dx){
	function ExtensibleText(text,options){
		if(text instanceof Text){
			this.$=text;
		}else if(text && text.$ && text.$ instanceof Text){
			this.$=text.$;
		}else{
			this.$=null;
		}
		this.cache=new dx.Object({});
		if(options && options.frame instanceof Frame){
			this.cache.frame=new dx.Frame(options.frame,{timeline:options.timeline});
		}else if(options && options.frame && options.frame.$ instanceof Frame){
			options.frame.timeline=options.frame;
			this.cache.frame=options.frame;	
		}
		return this;
	}
	ExtensibleText.prototype={
		__proto__:dx.Element.prototype,
		$:Text,
		type:ExtensibleText,
		//built in methods
		getSVG:function(){
		},
		is:function(text){
			return false;
		},
		get svg(){
			return this.getSVG();
		},
		set svg(){}
	}
	dx.extend({Text:ExtensibleText});
})(dx);
