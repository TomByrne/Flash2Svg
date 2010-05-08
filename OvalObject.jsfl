(function(ext){
	function ExtensibleOvalObject(shape,options){
		ext.Shape.apply(this,arguments);
		return this;
	}
	ExtensibleOvalObject.prototype={
		__proto__:ext.Shape.prototype,
		type:ExtensibleOvalObject,
		get startAngle(){return this.$.startAngle;},
		set startAngle(s){this.$.startAngle=s;},
		get endAngle(){return this.$.endAngle;},
		set endAngle(s){this.$.endAngle=s;},
		get innerRadius(){return this.$.innerRadius;},
		set innerRadius(s){this.$.innerRadius=s;},
		is:function(element,options){
			var settings=new ext.Object({
				checklist:[
					'objectSpaceBounds',
					'startAngle',
					'endAngle',
					'bottomRightRadius',
					'innerRadius'
				]		
			});
			settings.extend(options,true);
			return ext.Element.prototype.is.call(this,element,settings);
		}
	}
	ext.extend({OvalObject:ExtensibleOvalObject});
})(extensible);