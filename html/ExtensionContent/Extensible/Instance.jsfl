(function(ext){
	function ExtensibleInstance(instance,options){
		ext.Element.apply(this,arguments);
		return this;
	}
	ExtensibleInstance.prototype={
		__proto__:ext.Element.prototype,
		type:ExtensibleInstance,
		//built in functions
		get instanceType(){
			return this.$.instanceType;
		},
		set instanceType(s){
			this.$.instanceType=s;
		},
		get libraryItem(){
			return this.$.libraryItem;//new ext.LibraryItem
		},
		set libraryItem(s){
			this.$.libraryItem=s;
		}
	}
	ext.extend({Instance:ExtensibleInstance});
})(extensible);
