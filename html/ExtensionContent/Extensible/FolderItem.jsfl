(function(ext){
	function ExtensibleFolderItem(item,options){
		if(item instanceof FolderItem){
			this.$=item;
		}else if(
			item && item['type'] &&
			item.type==this.type
		){
			this.$=item.$;
			ext.Object.apply(this,item);
		}else{
			this.$=new FolderItem();
		}
		ext.LibraryItem.apply(this,[item,options]);
		return this;
	}
	ExtensibleFolderItem.prototype={
		__proto__:ext.LibraryItem.prototype,
		type:ExtensibleFolderItem,
		get children(){
			return this.getChildren();
		},
		getChildren:function(recursive){
			var libraryItems=this.library.items;
			var name=this.name;
			var re=new RegExp('^'+name);
			var items=new ext.Array();
			for(var i=0;i<libraryItems.length;i++){
				if(
					libraryItems[i].name.dir==this.name || (
						recursive &&
						re.test(libraryItems[i])
					)
				){
					items.push(libraryItems[i]);
				}
			}
			return items;
		}
	};
	ext.extend({FolderItem:ExtensibleFolderItem});
})(extensible)
