(function(ext){
	function ExtensibleFrame(frame,options){
		if(frame && frame.constructor.name=='Frame'){
			this.$=frame;
		}else if(frame && frame['type'] && frame.type==this.type){
			this.$=frame.$;
		}else{
			this.$=new Frame();
		}
		ext.Object.apply(this,[options]);
		this.cache=new ext.Object({});
		if(options && options.layer){
			if(options.layer instanceof Layer){
				this.cache.layer=new ext.Layer(options.layer,{timeline:options.timeline});
			}else if(options.layer.$ && options.layer.$ instanceof Layer){
				options.layer.timeline=options.timeline;
				this.cache.layer=options.layer;
			}
		}
		if(options && options.timeline){
			if(options.timeline instanceof Timeline){
				this.cache.timeline=new ext.Timeline(options.timeline);
			}else if(options.timeline.$ && options.timeline.$ instanceof Timeline){
				this.cache.timeline=options.timeline;
			}
		}
		return this;
	}
	ExtensibleFrame.prototype={
		__proto__:ext.Object.prototype,
		type:ExtensibleFrame,
		//built in methods
		getCustomEase:function(property){
			return this.$.getCustomEase(property);
		},
		setCustomEase:function(property,easeCurve){
			return this.$.setCustomEase(property,easeCurve);
		},
		convertMotionObjectTo2D:function(){
			return this.$.convertMotionObjectTo2D();
		},
		convertMotionObjectTo3D:function(){
			return this.$.convertMotionObjectTo3D();
		},
		getMotionObjectXML:function(){
			return this.$.getMotionObjectXML();
		},
		hasMotionPath:function(){
			return this.$.hasMotionPath();
		},
		is3DMotionObject:function(){
			return this.$.is3DMotionObject();
		},
		isMotionObject:function(){
			return this.$.isMotionObject();
		},
		selectMotionPath:function(){
			return this.$.selectMotionPath();
		},
		get actionScript(){
			return this.$.actionScript;
		},
		set actionScript(s){
			this.$.actionScript=s;
		},
		get duration(){
			return this.$.duration;
		},
		set duration(s){
			this.$.duration=s;
		},
		get elements(){
			var options={};
			if(this.timeline){options.timeline=this.timeline;}
			return(new ext.Selection(this.$.elements,options));
		},
		set elements(s){},
		get hasCustomEase(){
			return this.$.hasCustomEase;
		},
		set hasCustomEase(s){
			this.$.hasCustomEase=s;
		},
		get labelType(){
			return this.$.labelType;
		},
		set labelType(s){
			this.$.labelType=s;
		},
		get motionTweenOrientToPath(){
			return this.$.motionTweenOrientToPath;
		},
		set motionTweenOrientToPath(s){
			this.$.motionTweenOrientToPath=s;
		},
		get motionTweenRotate(){
			return this.$.motionTweenRotate;
		},
		set motionTweenRotate(s){
			this.$.motionTweenRotate=s;
		},
		get motionTweenRotateTimes(){
			return this.$.motionTweenRotateTimes;
		},
		set motionTweenRotateTimes(s){
			this.$.motionTweenRotateTimes=s;
		},
		get motionTweenScale(){
			return this.$.motionTweenScale;
		},
		set motionTweenScale(s){
			this.$.motionTweenScale=s;
		},
		get motionTweenSnap(){
			return this.$.motionTweenSnap;
		},
		set motionTweenSnap(s){
			this.$.motionTweenSnap=s;
		},
		get motionTweenSync(){
			return this.$.motionTweenSync;
		},
		set motionTweenSync(s){
			this.$.motionTweenSync=s;
		},
		get name(){
			return this.$.name;
		},
		set name(s){
			this.$.name=s;
		},
		get shapeTweenBlend(){
			return this.$.shapeTweenBlend;
		},
		set shapeTweenBlend(s){
			this.$.shapeTweenBlend=s;
		},
		get soundEffect(){
			return this.$.soundEffect;
		},
		set soundEffect(s){
			this.$.soundEffect=s;
		},
		get soundLibraryItem(){
			return this.$.soundLibraryItem;
		},
		set soundLibraryItem(s){
			this.$.soundLibraryItem=s;
		},
		get soundLoop(){
			return this.$.soundLoop;
		},
		set soundLoop(s){
			this.$.soundLoop=s;
		},
		get soundName(){
			return this.$.soundName;
		},
		set soundName(s){
			this.$.soundName=s;
		},
		get soundSync(){
			return this.$.soundSync;
		},
		set soundSync(s){
			this.$.soundSync=s;
		},
		get startFrame(){
			if(this.$ && this.$.hasOwnProperty('startFrame')){ // ! important ( bugfix/workaround )
				return this.$.startFrame;
			}else{
				return 0;	
			}
		},
		set startFrame(s){
			this.$.startFrame=s;
		},
		get tweenEasing(){
			return this.$.tweenEasing;
		},
		set tweenEasing(s){
			this.$.tweenEasing=s;
		},
		get tweenType(){
			return this.$.tweenType;
		},
		set tweenType(s){
			this.$.tweenType=s;
		},
		get tweenInstanceName(){
			return this.$.tweenInstanceName;
		},
		set tweenInstanceName(s){
			this.$.tweenInstanceName=s;
		},
		get useSingleEaseCurve(){
			return this.$.useSingleEaseCurve;
		},
		set useSingleEaseCurve(s){
			this.$.useSingleEaseCurve=s;
		},
		getTimeline:function(){
			return;
		},
		get timeline(){
			if(this.cache.timeline){
				return this.cache.timeline;
			}else{
				return this.getTimeline();
			}
		},
		set timeline(s){
			if(this.cache){this.cache.timeline=new ext.Timeline(s);}
		},
		get layer(){
			if(this.elements.length>0){return this.elements[0].layer;}
			else if(this.cache.layer){return this.cache.layer;}
		},
		set layer(s){
			this.cache.layer=s;
		},
		is:function(f,options){
			var settings=new ext.Object({
				fast:false,
				stacked:false,
				timeline:null,
				duplicateEntriesPossible:false
			});
			settings.extend(options);
			if(!f.$){f=new this.type(f);}
			var checklist=new ext.Array([
				'name','startFrame','actionScript','hasCustomEase','labelType',
				'motionTweenOrientToPath','motionTweenRotate','motionTweenRotateTimes',
				'motionTweenScale','motionTweenSnap','motionTweenSync','shapeTweenBlend',
				'soundEffect','soundLoop','soundLoopMode','soundName','soundSync','tweenEasing',
				'tweenInstanceName','tweenType','useSingleEaseCurve'
			]);
			if(!ext.Object.prototype.is.call(this,f,{checklist:checklist})){
				return false;
			}		
			if(
				!this.layer.is(
					f.layer,
					{
							timeline:settings.timeline,
							fast:settings.fast,
							duplicateEntriesPossible:settings.duplicateEntriesPossible
					}
				)
			){
				return false;
			}else if(settings.stacked){
				return true;
			}
			if(!this.elements.is(f.elements)){return false;}
			return true;
		}
	}
	ext.extend({Frame:ExtensibleFrame});
})(extensible);
