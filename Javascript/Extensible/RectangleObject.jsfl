(function(ext){
	function ExtensibleRectangleObject(shape,options){
		ext.Shape.apply(this,arguments);
		return this;
	}
	ExtensibleRectangleObject.prototype={
		__proto__:ext.Shape.prototype,
		type:ExtensibleRectangleObject,
		get topLeftRadius(){return this.$.topLeftRadius;},
		set topLeftRadius(s){this.$.topLeftRadius=s;},
		get bottomLeftRadius(){return this.$.bottomLeftRadius;},
		set bottomLeftRadius(s){this.$.bottomLeftRadius=s;},
		get topRightRadius(){return this.$.topRightRadius;},
		set topRightRadius(s){this.$.topRightRadius=s;},
		get bottomRightRadius(){return this.$.bottomRightRadius;},
		set bottomRightRadius(s){this.$.bottomRightRadius=s;},
		get lockFlag(){return this.$.lockFlag;},
		set lockFlag(s){this.$.lockFlag=s;},
		is:function(element,options){
			var settings=new ext.Object({
				checklist:[
					'objectSpaceBounds',
					'topLeftRadius',
					'bottomLeftRadius',
					'bottomRightRadius',
					'topRightRadius',
					'lockFlag'
				]		
			});
			settings.extend(options,true);
			return ext.Element.prototype.is.call(this,element,settings);
		}
	}
	ext.extend({RectangleObject:ExtensibleRectangleObject});
})(extensible);