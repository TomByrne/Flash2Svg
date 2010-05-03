(function(dx){
	function ExtensibleInstance(instance,options){
		dx.Element.apply(this,arguments);
		return this;
	}
	ExtensibleInstance.prototype={
		__proto__:dx.Element.prototype,
		type:ExtensibleInstance,
		//built in functions
		get instanceType(){return this.$.instanceType;},
		set instanceType(s){this.$.instanceType=s;},
		get libraryItem(){return this.$.libraryItem;},
		set libraryItem(s){this.$.libraryItem=s;}
	}
	dx.extend({Instance:ExtensibleInstance});
})(dx);
