(function(ext){
	function ExtensibleBitmapItem(item,options){
		this.cache={};
		if(item instanceof BitmapItem){
			this.$=item;
		}else if(
			item && item['type'] &&
			item.type==this.type
		){
			this.$=item.$;
			ext.Object.apply(this,item);
		}else{
			this.$=new BitmapItem();
		}
		ext.LibraryItem.apply(this,[item,options]);
		return this;
	}
	ExtensibleBitmapItem.prototype={
		__proto__:ext.LibraryItem.prototype,
		type:ExtensibleBitmapItem,
		get allowSmoothing(){
			return this.$.allowSmoothing;
		},
		set allowSmoothing(allowSmoothing){
			this.$.allowSmoothing=allowSmoothing;
		},
		get compressionType(){
			return this.$.compressionType;
		},
		set compressionType(compressionType){
			this.$.compressionType=compressionType;
		},
		exportToFile:function(fileURI){
			return this.$.exportToFile(fileURI);
		},
		get fileLastModifiedDate(){
			return this.$.fileLastModifiedDate;
		},
		set fileLastModifiedDate(fileLastModifiedDate){
			this.$.fileLastModifiedDate=fileLastModifiedDate;
		},
		get originalCompressionType(){
			return this.$.originalCompressionType;
		},
		set originalCompressionType(originalCompressionType){
			this.$.originalCompressionType=originalCompressionType;
		},
		get originalCompressionType(){
			return this.$.originalCompressionType;
		},
		set originalCompressionType(originalCompressionType){
			this.$.originalCompressionType=originalCompressionType;
		},
		get quality(){
			return this.$.quality;
		},
		set quality(quality){
			this.$.quality=quality;
		},
		get sourceFileExists(){
			return this.$.sourceFileExists;
		},
		set sourceFileExists(sourceFileExists){
			this.$.sourceFileExists=sourceFileExists;
		},
		get sourceFileIsCurrent(){
			return this.$.sourceFileIsCurrent;
		},
		set sourceFileIsCurrent(sourceFileIsCurrent){
			this.$.sourceFileIsCurrent=sourceFileIsCurrent;
		},
		get sourceFilePath(){
			return this.$.sourceFilePath;
		},
		set sourceFilePath(sourceFilePath){
			this.$.sourceFilePath=sourceFilePath;
		},
		get useDeblocking(){
			return this.$.useDeblocking;
		},
		set useDeblocking(useDeblocking){
			this.$.useDeblocking=useDeblocking;
		},
		get useImportedJPEGQuality(){
			return this.$.useImportedJPEGQuality;
		},
		set useImportedJPEGQuality(useImportedJPEGQuality){
			this.$.useImportedJPEGQuality=useImportedJPEGQuality;
		},
		getBits:function(){
			var timeline=ext.timeline;
			var lib=ext.lib;
			timeline.addNewLayer('layer','normal',false);
			var bits;
			try{
				lib.addItemToDocument({x:0,y:0},this.name);
				var layer=timeline.layers[timeline.getSelectedLayers()[0]];
				var bitmap=layer.elements[0];
				bits=bitmap.getBits();
				this.cache.bits=bits.bits;
				this.cache.width=bits.width;
				this.cache.height=bits.height;
				this.cache.bits=bits.bits;
				this.cache.bitDepth=bits.bitDepth;
				this.cache.cTab=bits.cTab;
			}catch(e){
				ext.warn(e);
			}
			timeline.deleteLayer();
			return bits;
		},
		get width(){
			if(this.cache.width==undefined){
				this.getBits();
			}
			return this.cache.width;
		},
		set width(width){
			this.cache.width=width;
		},
		get height(){
			if(this.cache.height==undefined){
				this.getBits();
			}
			return this.cache.height;
		},
		set height(height){
			this.cache.height=height;
		},
		get bits(){
			if(this.cache.bits==undefined){
				this.getBits();
			}
			return this.cache.bits;
		},
		set bits(bits){
			this.cache.bits=bits;
		},
		get cTab(){
			if(this.cache.cTab==undefined){
				this.getBits();
			}
			return this.cache.cTab;
		},
		set cTab(cTab){
			this.cache.cTab=cTab;
		},
		get bitDepth(){
			if(this.cache.bitDepth==undefined){
				this.getBits();
			}
			return this.cache.bitDepth;
		},
		set bitDepth(bitDepth){
			this.cache.bitDepth=bitDepth;
		}
		//,base64
	};
	ext.extend({BitmapItem:ExtensibleBitmapItem});
})(extensible)
