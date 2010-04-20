(function(dx){
	function ExtensibleFrame(frame,options){
		if(frame && frame.constructor.name=='Frame'){
			this.$=frame;
		}else if(frame && frame['type'] && frame.type==this.type){
			this.$=frame.$;
		}else{
			this.$=new Frame();
		}
		return this;
	}
	ExtensibleFrame.prototype={
		__proto__:dx.Object.prototype,
		$:Frame,
		type:ExtensibleFrame,
		//built in methods
		getCustomEase:function(property){return this.$.getCustomEase(property);},
		setCustomEase:function(property,easeCurve){return this.$.setCustomEase(property,easeCurve);},
		convertMotionObjectTo2D:function(){return this.$.convertMotionObjectTo2D();},
		convertMotionObjectTo3D:function(){return this.$.convertMotionObjectTo3D();},
		getMotionObjectXML:function(){return this.$.getMotionObjectXML();},
		hasMotionPath:function(){return this.$.hasMotionPath();},
		is3DMotionObject:function(){return this.$.is3DMotionObject();},
		isMotionObject:function(){return this.$.isMotionObject();},
		selectMotionPath:function(){return this.$.selectMotionPath();},
		//built-in properties
		get actionScript(){return this.$.actionScript;},
		set actionScript(s){this.$.actionScript=s;},
		get duration(){return this.$.duration;},
		set duration(s){this.$.duration=s;},
		get elements(){
			var inputElements=this.$.elements;
			var elements=new dx.Array();
			for(var i=0;i<inputElements.length;i++){
				if(inputElements[i] instanceof Shape){
					elements.push(new dx.Shape(inputElements[i]));
				}else if(inputElements[i] instanceof Element){
					elements.push(new dx.Element(inputElements[i]));
				}
			}
			return elements;
		},
		set elements(s){},
		get hasCustomEase(){return this.$.hasCustomEase;},
		set hasCustomEase(s){this.$.hasCustomEase=s;},
		get labelType(){return this.$.labelType;},
		set labelType(s){this.$.labelType=s;},
		get motionTweenOrientToPath(){return this.$.motionTweenOrientToPath;},
		set motionTweenOrientToPath(s){this.$.motionTweenOrientToPath=s;},
		get motionTweenRotate(){return this.$.motionTweenRotate;},
		set motionTweenRotate(s){this.$.motionTweenRotate=s;},
		get motionTweenRotateTimes(){return this.$.motionTweenRotateTimes;},
		set motionTweenRotateTimes(s){this.$.motionTweenRotateTimes=s;},
		get motionTweenScale(){return this.$.motionTweenScale;},
		set motionTweenScale(s){this.$.motionTweenScale=s;},
		get motionTweenSnap(){return this.$.motionTweenSnap;},
		set motionTweenSnap(s){this.$.motionTweenSnap=s;},
		get motionTweenSync(){return this.$.motionTweenSync;},
		set motionTweenSync(s){this.$.motionTweenSync=s;},
		get name(){return this.$.name;},
		set name(s){this.$.name=s;},
		get shapeTweenBlend(){return this.$.shapeTweenBlend;},
		set shapeTweenBlend(s){this.$.shapeTweenBlend=s;},
		get soundEffect(){return this.$.soundEffect;},
		set soundEffect(s){this.$.soundEffect=s;},
		get soundLibraryItem(){return this.$.soundLibraryItem;},
		set soundLibraryItem(s){this.$.soundLibraryItem=s;},
		get soundLoop(){return this.$.soundLoop;},
		set soundLoop(s){this.$.soundLoop=s;},
		get soundName(){return this.$.soundName;},
		set soundName(s){this.$.soundName=s;},
		get soundSync(){return this.$.soundSync;},
		set soundSync(s){this.$.soundSync=s;},
		get startFrame(){return this.$.startFrame;},
		get tweenEasing(){return this.$.tweenEasing;},
		set tweenEasing(s){this.$.tweenEasing=s;},
		get tweenType(){return this.$.tweenType;},
		set tweenType(s){this.$.tweenType=s;},
		get tweenInstanceName(){return this.$.tweenInstanceName;},
		set tweenInstanceName(s){this.$.tweenInstanceName=s;},
		get useSingleEaseCurve(){return this.$.useSingleEaseCurve;},
		set useSingleEaseCurve(s){this.$.useSingleEaseCurve=s;},
		//methods
		is:function(f){
			return((f.$ && f.$==this.$)||(f==this.$));	
		}
	}
	dx.extend({Frame:ExtensibleFrame});
})(dx);
