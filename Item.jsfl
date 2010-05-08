(function(ext){
	function ExtensibleItem(item,options){
		if(item instanceof Item){
			this.$=item;
		}else if(item && item['type'] && item.type==this.type){
			this.$=item.$;
			ext.Object.apply(this,item);
		}else{
			this.$=new Item();
		}
		ext.Object.apply(this,[options]);
		return this;
	}
	ExtensibleItem.prototype={
		__proto__:ext.Object.prototype,
		type:ExtensibleItem,
		addData:function(){
			return;
		}
	};
	ext.extend({Item:ExtensibleItem});
})(extensible)
