(function(dom){
	function Extensible(options){
		BridgeTalk.apply(this,[]);
		this._modules=[];
		this.warnings=true;
		this.log=undefined;
		for(var o in options){
			this[o]=options[o];
		}
		this.progressbar=undefined;
		this.dir=fl.scriptURI.replace(/\/[^\/]*?$/g,"");
		if(FLfile.exists(this.dir+'/.builders')){
			var xml=new XML(FLfile.read(this.dir+'/.builders'));
			var fileName=fl.scriptURI.split('/').pop();
			var scriptXML;
			try{
				scriptXML=xml.script.(@file==fileName);
			}catch(e){}
			if(scriptXML && scriptXML.length()){
				this.dev=true;
				this.builderURI=String(scriptXML[0].@builder);
			}			
		}
		return this;
	}
	Extensible.prototype={
		__proto__:BridgeTalk,
		extend:function(obj){
			for(var n in obj){
				if(obj.hasOwnProperty(n)){
					this[n]=obj[n];
				}
			}
		},
		load:function(mods,force){
			if(force){this._modules=[];}
			if(mods && mods.length){
				for(var i=0;i<mods.length;i++){
					if(force || this._modules.indexOf[mods[i]]<0){
						var file=this.dir+"/"+mods[i]+".jsfl";
						if(file!=fl.scriptURI && FLfile.exists(file)){
							try{
								fl.runScript(file);
								this.modules.push(mods[i]);
							}catch(e){
								this.warn("Problem loading "+mods[i]);
								break;
							}
						}
					}
				}
			}
			return this;
		},
		get doc(){
			try{
				return fl.getDocumentDOM();
			}catch(e){
				return null;	
			}
		},
		set doc(){},
		get timeline(){
			return new this.Timeline(this.doc.getTimeline());
		},
		set timeline(){},
		get timelines(){
			var timelines=new this.Array();
			var t=new this.Array(this.doc.timelines);
			for(var i=0;i<t.length;i++){
				timelines.push(new this.Timeline(t[i]));
			}
			return timelines;
		},
		set timelines(){},
		get frame(){
			return this.timeline.currentFrame;
		},
		set frame(){},
		get layer(){
			return this.timeline.currentLayer;
		},
		set layer(){},
		get lib(){
			return new this.Library(this.doc.library);
		},
		set lib(){},
		get sel(){
			return(new this.Selection(this.doc.selection));
		},
		set sel(s){
			var sel=this.sel;
			if(s.type!==extensible.Selection){
				s=new this.Selection(s);
			}
			var removeSel=s.length==0?sel:(sel.length==0?[]:sel.remove(s));
			var addSel=s.length==0?[]:(sel.length==0?s:s.remove(sel));
			for(i=0;i<removeSel.length;i++){
				try{
					removeSel[i].selected=false;
				}catch(e){
					this.warn('Error');
				}
			}
			for(i=0;i<addSel.length;i++){
				try{
					addSel[i].selected=true;
				}catch(e){
					this.warn('Error');
				}
			}
		},
		get viewMatrix(){
			return new this.Matrix(this.doc.viewMatrix);
		},
		set viewMatrix(){},
		get publishProfile(){
			return new XML(this.doc.exportPublishProfileString());
		},
		set publishProfile(s){},
		get includeHiddenLayers(){
			return this.publishProfile.PublishFlashProperties.InvisibleLayer.valueOf()==1;
		},
		set includeHiddenLayers(s){
			this.publishProfile.PublishFlashProperties.InvisibleLayer=s?1:0;			
		},
		get flashVersion(){
			return Number((/\d*\d/.exec(fl.version))[0]);		
		},
		set flashVersion(){
			return;
		},
		swfPanel:function(name){
			if(!name){
				return null;	
			}
			for(var i=0;i<fl.swfPanels.length;i++){
				if(fl.swfPanels[i].name==name){
					return fl.swfPanels[i];
				}
			}
			return null;
		},
		get modules(){
			return this._modules;
		},
		ping:function(){
			return true;
		},
		set modules(m){
			this.load(m);
		},
		startLog:function(options){
			this.log=new this.Log(options);
		},
		stopLog:function(){
			if(this.log){
				this.log.stop();
				delete this.log;
			}
		},
		warn:function(warning){
			var message='Warning: '+warning;
			if(this.warnings){
				fl.trace(message);
			}
		},
		message:function(message){
			fl.trace(message);	
		},
		
		SETTINGS_EXTENSION:".settings",
		saveAppSettings:function(saveName, dir, str){
			dir = fl.configURI + dir;
			if(!FLfile.exists(dir)){
				if(!FLfile.createFolder(dir)){
					return false;
				}
			}
			var path = dir + saveName + extensible.SETTINGS_EXTENSION;
			return FLfile.write(path, str);
		},
		loadAppSettings:function(saveName, dir){
			dir = fl.configURI + dir;
			var path = dir + saveName + extensible.SETTINGS_EXTENSION;
			if(FLfile.exists(path)){
				var fileData = FLfile.read(path);
				if(fileData.length==0)return null;
				return fileData;
			}else{
				return null;
			}
		},
		
		saveTimelineSettings:function(saveName, str){
			if(extensible.doc==null)return null;
			
			if(extensible.doc.getTimeline().libraryItem){
				extensible.doc.getTimeline().libraryItem.addData(saveName, "string", str);
			}else{
				saveName += "_"+extensible.doc.currentTimeline;
				extensible.doc.addDataToDocument(saveName, "string", str);
			}
		},
		loadTimelineSettings:function(saveName){
			if(extensible.doc==null)return null;
			
			if(extensible.doc.getTimeline().libraryItem!=null){
				if(extensible.doc.getTimeline().libraryItem.hasData(saveName)){
					return extensible.doc.getTimeline().libraryItem.getData(saveName);
				}else{
					return null;
				}
			}else{
				saveName += "_"+extensible.doc.currentTimeline;
				if(extensible.doc.documentHasData(saveName)){
					return extensible.doc.getDataFromDocument(saveName);
				}else{
					return null;
				}
			}
		},
		getDefaultTimelineFileName:function(){
			var fileName;
			if(!extensible.doc){
				return "";
			}
			/*if(extensible.doc.pathURI){
				fileName = extensible.doc.pathURI.relativeToDocument.stripExtension();
			}else{*/
				fileName = extensible.doc.name.stripExtension();
			//}
			if(extensible.doc.getTimeline().libraryItem!=null || extensible.doc.timelines.length>1){
				fileName += "_"+extensible.doc.getTimeline().name;
			}
			fileName += ".svg";
			return fileName;
		},
		getDefaultFolderName:function(){
			var fileName;
			if(!extensible.doc){
				return "";
			}
			return extensible.doc.name.stripExtension() + "/";
		},
		loadSettingsListing:function(dir){
			dir = fl.configURI + dir;
			if(!FLfile.exists(dir)){
				FLfile.createFolder(dir);
				return [];
			}
			var files = FLfile.listFolder(dir, "files");
			var ret = [];
			for(var i=0; i<files.length; i++){
				var fileName = files[i];
				if(fileName.indexOf(extensible.SETTINGS_EXTENSION) == fileName.length - extensible.SETTINGS_EXTENSION.length){
					ret.push(fileName.substr(0, fileName.length - extensible.SETTINGS_EXTENSION.length));
				}
			}
			return ret;
		}
	};
	dom.extensible=new Extensible({
		builderURI:(dom.extensible?dom.extensible.builderURI:undefined)
	});
})(this);

if(fl.scriptURI && fl.scriptURI!="unknown:"){
	// This is only run for the flash version of the plugin
	extensible.load(
		[
			'String',
			'Object',
			'Array',
			'Matrix',
			'Color',
			'HalfEdge',
			'Point',
			'Curve',
			'Vertex',
			'Edge',
			'Fill',
			'Stroke',
			'Contour',
			'Element',
			'Shape',
			'OvalObject',
			'RectangleObject',
			'Instance',
			'SymbolInstance',
			'BitmapInstance',
			'Text',
			'TLFText',
			'Frame',
			'Layer',
			'Timeline',
			'Selection',
			'LibraryItem',
			'BitmapItem',
			'FolderItem',
			'SymbolItem',
			'Library',
			'Clipboard',
			'Math',
			'Task',
			'SVG',
			'Log',
			'Que',
			'Timer',
			'Function',
			'MathUtils',
			'ArrayUtils',
			'Geom'
		],
		true
	);
}