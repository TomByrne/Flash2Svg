(function(ext){
	function ExtensibleLibrary(lib,options){
		if(lib && lib.constructor.name=='Library'){
			this.$=lib;
		}else if(lib && lib['type'] && lib.type==this.type){
			this.$=lib.$;
			ext.Object.apply(this,lib);
		}else{
			this.$=new Library();
		}
		ext.Object.apply(this,[options]);
		return this;
	}
	ExtensibleLibrary.prototype={
		__proto__:ext.Object.prototype,
		type:ExtensibleLibrary,
		addItemToDocument:function(position,namepath){
			return this.$.addItemToDocument(position,namepath);
		},
		addNewItem:function(type,namepath){
			return this.$.addNewItem(type,namepath);
		},
		deleteItem:function(namePath){
			return this.$.deleteItem(namePath);
		},
		duplicateItem:function(namePath){
			return this.$.duplicateItem();
		},
		editItem:function(namePath){
			return this.$.editItem(namePath);
		},
		expandFolder:function(bExpand,bRecurseNestedParents,namePath){
			return this.$.expandFolder(bExpand,bRecurseNestedParents,namePath);
		},
		findItemIndex:function(namePath){
			return this.$.findItemIndex(namePath);
		},
		getItemProperty:function(property){
			return this.$.getItemProperty(property);
		},
		getItemType:function(namePath){
			return this.$.getItemType(namePath);
		},
		getSelectedItems:function(){
			var items=this.$.getSelectedItems();
			for(var i=0;i<items.length;i+=1){
				var item;
				if(items[i] instanceof FolderItem){	
					item=new ext.FolderItem(items[i]);
				}else if(items[i] instanceof SymbolItem){
					item=new ext.SymbolItem(items[i]);
				}else{
					item=new ext.LibraryItem(items[i]);
				}
				item.library=this;
				items[i]=item;
			}
			return items;	
		},
		importEmbeddedSWF:function(linkageName,swfData,libName){
			return this.$.importEmbeddedSWF(linkageName,swfData,libName);
		},
		itemExists:function(namePath){
			return this.$.itemExists(namePath);
		},
		get items(){
			var items=new ext.Array(this.$.items);
			for(var i=0;i<items.length;i+=1){
				var item=items[i];
				if(item instanceof FolderItem){		
					item=new ext.FolderItem(items[i]);
				}else if(item instanceof SymbolItem){
					item=new ext.SymbolItem(items[i]);
				}else{
					item=new ext.LibraryItem(items[i]);
				}
				item.library=this;
				items[i]=item;
			}
			return items;
		},
		set items(){},
		moveToFolder:function(folderPath,itemToMove,bReplace){
			if(itemToMove){
				itemToMove.name=folderPath+'/'+itemToMove.name.basename;
			}
			return this.$.moveToFolder.apply(this,arguments);
		},
		newFolder:function(folderPath){
			return this.$.newFolder(folderPath);
		},
		renameItem:function(name){
			return this.$.renameItem(name);
		},
		selectAll:function(bSelectAll){
			return this.$.selectAll(bSelectAll);
		},
		selectItem:function(namePath,bReplaceCurrentSelection,bSelect){
			return this.$.selectItem(namePath);
		},
		selectNone:function(){
			return this.$.selectNone();
		},
		setItemProperty:function(property,value){
			return this.$.setItemProperty(property,value);
		}, 
		updateItem:function(namePath){
			return this.$.updateItem(namePath);
		},
		uniqueName:function(name){
			if(this.itemExists(name)){
				if(/\_[\d]*?$/.test(name)){
					return this.uniqueName(name.replace(/[\d]*?$/,String(Number(/[\d]*?$/.exec(name)[0])+1)));
				}else{
					return this.uniqueName(name+"_1");
				}
			}
			return name;
		}
	};
	ext.extend({Library:ExtensibleLibrary});
})(extensible)
