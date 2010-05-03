(function(dx){
	function ExtensibleRectangleObject(shape,options){
		dx.Shape.apply(this,arguments);
		return this;
	}
	ExtensibleShape.prototype={
		__proto__:dx.Shape.prototype,
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
			var settings=new dx.Object({
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
			return dx.Element.prototype.is.call(this,element,settings);
		}
	}
	dx.extend({RectangleObject:ExtensibleRectangleObject});
})(dx);