/* DAVID BELAIS 2010 DAVID@DISSENTGRAPHICS.COM
 * EXTENSIBLE : A javascript Framework for extending Flash. */
 
(function(dom){
	function Extensible(options){
		this._modules=[];
		this.log=undefined;
		for(var o in options){
			this[o]=options[o];
		}
		this.progressbar=undefined;
		this.dir=fl.scriptURI.replace(/\/[^\/]*?$/g,"");
		return this;
	}
	Extensible.prototype={
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
							fl.runScript(file);
							this.modules.push(mods[i]);
						}
					}
				}
			}
			return this;
		},
		get doc(){
			return fl.getDocumentDOM();
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
			s=new this.Selection(s);
			var removeSel=sel.remove(s);
			var addSel=s.remove(sel);
			for(i=0;i<removeSel.length;i++){removeSel[i].selected=false;}
			for(i=0;i<addSel.length;i++){
				addSel[i].selected=true;
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
		get modules(){
			return this._modules;
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
		buildExtension:function(options){
			var settings=new this.Object({
				name:undefined,
				commands:undefined,
				modules:undefined
			});
			settings.extend(options);
			var url=this.dir+"/"+settings.name+'.mxi';
			var xmlString=FLfile.read(url);
			var header=/<\?xml.*?\?>/.exec(xmlString);
			var xmlString;
			if(header.length){
				header=header[0];
				xmlString=xmlString.replace(header,'');
			}else{
				header='';	
			}
			var xml=new XML(xmlString);
			delete xml.files.file;
			var modules=settings.modules||this._modules;
			for(var i=0;i<settings.commands.length;i++){
				var x=new XML('<file/>');
				x['@source']='Commands/'+settings.commands[i]+'.jsfl';
				x['@destination']='$flash/Commands';
				xml.files.appendChild(x);
			}			
			for(var i=0;i<modules.length;i++){
				var x=new XML('<file/>');
				x['@source']=modules[i]+'.jsfl';
				x['@destination']='$flash/Javascript/Extensible';
				xml.files.appendChild(x);
			}
			FLfile.write(this.dir+"/"+settings.name+'.mxi',header+'\n'+xml.toXMLString());
		}
	};
	dom.extensible=new Extensible();
})(this);
extensible.load(
	[
		'String',
		'Object',
		'Array',
		'Matrix',
		'Color',
		'HalfEdge',
		'Point',
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
		'Library',
		'Item',
		'Clipboard',
		'Math',
		'SVG',
		'Log',
		'ProgressBar'
	],
	true
);




