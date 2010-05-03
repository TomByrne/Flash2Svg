(function(dx){
	function ExtensibleOvalObject(shape,options){
		dx.Shape.apply(this,arguments);
		return this;
	}
	ExtensibleShape.prototype={
		__proto__:dx.Shape.prototype,
		type:ExtensibleOvalObject,
		get startAngle(){return this.$.startAngle;},
		set startAngle(s){this.$.startAngle=s;},
		get endAngle(){return this.$.endAngle;},
		set endAngle(s){this.$.endAngle=s;},
		get innerRadius(){return this.$.innerRadius;},
		set innerRadius(s){this.$.innerRadius=s;},
		is:function(element,options){
			var settings=new dx.Object({
				checklist:[
					'objectSpaceBounds',
					'startAngle',
					'endAngle',
					'bottomRightRadius',
					'innerRadius'
				]		
			});
			settings.extend(options,true);
			return dx.Element.prototype.is.call(this,element,settings);
		}
	}
	dx.extend({OvalObject:ExtensibleOvalObject});
})(dx);