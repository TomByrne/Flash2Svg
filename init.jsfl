/* DAVID BELAIS 2010 DAVID@DISSENTGRAPHICS.COM
 * DISSENT GRAPHICS' JSFL Framework 
 * provides extensible javascript contructors for
 * extending Native Code DOM elements within the 
 * Flash Javascript API. */
 
(function(dom){
	function DX(options){
		this._modules=[];
		for(var o in options){this[o]=options[o];}
		return this;
	}
	DX.prototype={
		extend:function(obj){
			for(var n in obj){
				this[n]=obj[n];
			}
		},
		load:function(mods,force){
			if(force){this._modules=[];}
			if(mods && mods.length){
				for(i=0;i<mods.length;i++){
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
		get dir(){
			return(fl.scriptURI.replace(/\/[^\/]*?$/g,""));
		},
		set dir(){},
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
			return(this.doc.library);
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
		set exportHiddenLayer(s){},
		get modules(){return this._modules;},
		set modules(m){this.load(m);}
	};
	dom.dx=new DX();
})(this)
dx.load(
	[
		'String',
		'Object',
		'Array',
		'Matrix',
		'Color',
		'HalfEdge',
		'Point',
		'Edge',
		'Fill',
		'Stroke',
		'Contour',
		'Element',
		'Shape',
		'Instance',
		'SymbolInstance',
		'BitmapInstance',
		'Text',
		'TLFText',
		'Frame',
		'Layer',
		'Timeline',
		'Selection',
		'Clipboard',
		'SVG',
		'Log'
	],
	true
);




