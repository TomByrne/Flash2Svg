(function(ext){
	function ExtensibleSymbolInstance(instance,options){
		ext.Element.apply(this,arguments);
		return this;
	}
	ExtensibleSymbolInstance.prototype={
		__proto__:ext.Instance.prototype,
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
		get timeline(){
			return(
				(this.libraryItem.timeline instanceof ext.Timeline)?
				this.libraryItem.timeline:
				new ext.Timeline(this.libraryItem.timeline)
			);
		},
		set timeline(s){return;},
		getNumCubicSegments:function(options){
			return this.timeline.getNumCubicSegments(options);
		},
		getCurrentFrame:function(parentFrame){
			if(typeof(parentFrame)!='number'){
				parentFrame=0;
			}
			var frame=0;
			var timeline=this.timeline;
			if(this.firstFrame!==undefined){
				var startFrame=0;
				if(parentFrame==0 || this.frame.duration<2){ // ! important ( bugfix/workaround )
					startFrame=parentFrame;
				}else{
					startFrame=this.frame.startFrame;
				}
				var playPosition=(
					(parentFrame-startFrame)+this.firstFrame
				);
				if(this.loop=='single frame'){
					frame=this.firstFrame;
				}else if(this.loop=='play once'){
					frame=(
						playPosition<timeline.frameCount?
						playPosition:
						timeline.frameCount-1
					);
				}else if(this.loop=='loop'){
					frame=playPosition % timeline.frameCount;
				}
			}else{
				frame=0;
			}
			return frame;
		},
		/**
		 * Can be used to get object space bounds specific to a particular frame.
		 * @param {Object} options
		 * @param {Number} options.frame
		 * @param {Array} options.frames
		 * @param {Boolean} options.includeGuides
		 * @param {Boolean} options.includeHiddenLayers
		 */
		getObjectSpaceBounds:function(options){
			if(!options){
				var objectSpaceBounds=this.objectSpaceBounds;
				if(objectSpaceBounds){
					return objectSpaceBounds;
				}
			}
			return this.timeline.getBoundingBox(options);
		}
	}
	ext.extend({SymbolInstance:ExtensibleSymbolInstance});
})(extensible);
