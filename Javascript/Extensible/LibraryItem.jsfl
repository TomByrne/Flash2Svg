(function(ext){
	function ExtensibleLibraryItem(item,options){
		if(item instanceof LibraryItem){
			this.$=item;
			this.name=item.name;
		}else if(
			item && item['type'] &&
			item.type==this.type
		){
			this.$=item.$;
			ext.Object.apply(this,item);
		}else{
			this.$=new LibraryItem();
		}
		this.library=ext.lib;
		ext.Object.apply(this,[options]);
		return this;
	}
	ExtensibleLibraryItem.prototype={
		__proto__:ext.Object.prototype,
		type:ExtensibleLibraryItem,
		addData:function(name,type,data){
			return this.$.addData(name,type,data);
		},
		getData:function(name){
			if(this.$.hasData(name)){
				return this.$.getData(name);
			};
		},
		hasData:function(name){
			return this.$.hasData(name);
		},
		removeData:function(name){
			return this.$.removeData(name);	
		},
		get itemType(){
			return this.$.itemType;	
		},
		set itemType(type){}, // read only
		get linkageBaseClass(){
			return this.$.linkageBaseClass;	
		},
		set linkageBaseClass(class){
			this.$.linkageBaseClass=class;
		},
		get linkageClassName(){
			return this.$.linkageClassName;
		},
		set linkageClassName(name){
			this.$.linkageClassName=name;	
		},
		get linkageExportForAS(){
			return this.$.linkageExportForAS;	
		},
		set linkageExportForAS(bLink){
			this.$.linkageExportForAS=bLink;
		},
		get linkageExportForRS(){
			return this.$.linkageExportForRS;	
		},
		set linkageExportForRS(bLink){
			this.$.linkageExportForRS=bLink;
		},
		get linkageExportInFirstFrame(){
			return this.$.linkageExportInFirstFrame;	
		},
		set linkageExportInFirstFrame(bExport){
			this.$.linkageExportInFirstFrame=bExport;
		},
		get linkageIdentifier(){
			return this.$.linkageIdentifier;
		},
		set linkageIdentifier(id){
			this.$.linkageIdentifier=id;	
		},
		get linkageImportForRS(){
			return this.$.linkageImportForRS;
		},
		set linkageImportForRS(bImport){
			this.$.linkageImportForRS=bImport;
		},
		get linkageURL(){
			return this.$.linkageURL;	
		},
		set linkageURL(url){
			this.$.linkageURL=url;	
		}
	};
	ext.extend({LibraryItem:ExtensibleLibraryItem});
})(extensible)
