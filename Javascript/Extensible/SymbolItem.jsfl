(function(ext){
	function ExtensibleSymbolItem(item,options){
		if(item instanceof SymbolItem){
			this.$=item;
			this.timeline=new ext.Timeline(item.timeline);
		}else if(
			item && item['type'] &&
			item.type==this.type
		){
			this.$=item.$;
			ext.Object.apply(this,item);
		}else{
			this.$=new SymbolItem();
		}
		ext.LibraryItem.apply(this,[item,options]);
		return this;
	}
	ExtensibleSymbolItem.prototype={
		__proto__:ext.LibraryItem.prototype,
		type:ExtensibleSymbolItem,
		convertToCompiledClip:function(){
			return this.$.convertToCompiledClip();	
		},
		exportSWC:function(outputURI){
			return this.$.exportSWC(outputURI);	
		},
		exportSWF:function(outputURI){
			return this.$.exportSWF(outputURI);	
		},
		get scalingGrid(){
			return this.$.scalingGrid;	
		},
		set scalingGrid(bScalingGrid){
			this.$.scalingGrid=bScalingGrid;	
		},
		get scalingGridRect(){
			return this.$.scalingGridRect;	
		},
		set scalingGridRect(rectangle){
			this.$.scalingGridRect=rectangle;	
		},
		get scalingGridRect(){
			return this.$.scalingGridRect;
		},
		set scalingGridRect(rectangle){
			this.$.scalingGridRect=rectangle;	
		},
		get sourceAutoUpdate(){
			return this.$.sourceAutoUpdate;	
		},
		set sourceAutoUpdate(bAutoUpdate){
			this.$.sourceAutoUpdate=bAutoUpdate;	
		},
		get sourceFilePath(){
			return this.$.sourceFilePath;	
		},
		set sourceFilePath(uri){zz
			this.$.sourceFilePath=uri;	
		},
		get sourceLibraryName(){
			return this.$.sourceLibraryName;	
		},
		set sourceLibraryName(name){
			this.$.sourceLibraryName=name;	
		},
		get symbolType(){
			return this.$.symbolType;
		},
		set symbolType(type){
			this.$.symbolType=type;	
		}
	};
	ext.extend({SymbolItem:ExtensibleSymbolItem});
})(extensible)
