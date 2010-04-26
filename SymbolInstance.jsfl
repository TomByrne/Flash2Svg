(function(dx){
	function ExtensibleSymbolInstance(instance,options){
		if(instance instanceof SymbolInstance){
			this.$=instance;
		}else if(instance && instance.$ && instance.$ instanceof SymbolInstance){
			this.$=instance.$;
		}else{
			this.$=null;
		}
		this.cache=new dx.Object({});
		if(options && options.frame instanceof Frame){
			this.cache.frame=new dx.Frame(options.frame,{timeline:options.timeline});
		}else if(options && options.frame && options.frame.$ instanceof Frame){
			options.frame.timeline=options.timeline;
			this.cache.frame=options.frame;	
		}
		return this;
	}
	ExtensibleSymbolInstance.prototype={
		__proto__:dx.Instance.prototype,
		type:ExtensibleSymbolInstance,
		//built in properties
		get accName(){return this.$.accName;},
		set accName(s){this.$.accName=s;},
		get actionScript(){return this.$.actionScript;},
		set actionScript(s){this.$.actionScript=s;},
		get blendMode(){return this.$.blendMode;},
		set blendMode(s){this.$.blendMode=s;},
		get buttonTracking(){return this.$.buttonTracking;},
		set buttonTracking(s){this.$.buttonTracking=s;},
		get cacheAsBitmap(){return this.$.cacheAsBitmap;},
		set cacheAsBitmap(s){this.$.cacheAsBitmap=s;},
		get colorAlphaAmount(){return this.$.colorAlphaAmount;},
		set colorAlphaAmount(s){this.$.colorAlphaAmount=s;},
		get colorAlphaPercent(){return this.$.colorAlphaPercent;},
		set colorAlphaPercent(s){this.$.colorAlphaPercent=s;},
		get colorBlueAmount(){return this.$.colorBlueAmount;},
		set colorBlueAmount(s){this.$.colorBlueAmount=s;},
		get colorBluePercent(){return this.$.colorBluePercent;},
		set colorBluePercent(s){this.$.colorBluePercent=s;},
		get colorGreenAmount(){return this.$.colorGreenAmount;},
		set colorGreenAmount(s){this.$.colorGreenAmount=s;},
		get colorGreenPercent(){return this.$.colorGreenPercent;},
		set colorGreenPercent(s){this.$.colorGreenPercent=s;},
		get colorMode(){return this.$.colorMode;},
		set colorMode(s){this.$.colorMode=s;},
		get colorRedAmount(){return this.$.colorRedAmount;},
		set colorRedAmount(s){this.$.colorRedAmount=s;},
		get colorRedPercent(){return this.$.colorRedPercent;},
		set colorRedPercent(s){this.$.colorRedPercent=s;},
		get description(){return this.$.description;},
		set description(s){this.$.description=s;},
		get filters(){return this.$.filters;},
		set filters(s){this.$.filters=s;},
		get firstFrame(){return this.$.firstFrame;},
		set firstFrame(s){this.$.firstFrame=s;},
		get forceSimple(){return this.$.forceSimple;},
		set forceSimple(s){this.$.forceSimple=s;},
		get loop(){return this.$.loop;},
		set loop(s){this.$.loop=s;},
		get shortcut(){return this.$.shortcut;},
		set shortcut(s){this.$.shortcut=s;},
		get silent(){return this.$.silent;},
		set silent(s){this.$.silent=s;},
		get symbolType(){return this.$.symbolType;},
		set symbolType(s){this.$.symbolType=s;},
		get tabIndex(){return this.$.tabIndex;},
		set tabIndex(s){this.$.tabIndex=s;},
		//built in methods
		//
		get timeline(){
			return new dx.Timeline(this.libraryItem.timeline);
		},
		set timeline(s){},
		is:function(instance){
			return false;
		},
		get svg(){
			return this.getSVG();
		},
		set svg(){}
	}
	dx.extend({SymbolInstance:ExtensibleSymbolInstance});
})(dx);
