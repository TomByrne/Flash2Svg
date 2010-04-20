//DAVID BELAIS 2009 DAVID@DISSENTGRAPHICS.COM
//MIT LICENSE

function DX(options){
	for(var o in options){this[o]=options[o];}
	this.modules=[];
	return this;
}
DX.prototype={
	extend:function(obj){
		for(var n in obj){
			this[n]=obj[n];
		}
	},
	load:function(mods,force){
		if(force){this.modules=[];}
		if(mods && mods.length){
			for(i=0;i<mods.length;i++){
				if(force || this.modules.indexOf[mods[i]]<0){
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
		s=new this.Selection(s);
		var removeSel=this.sel.remove(s);
		var addSel=s.remove(dx.sel);
		for(i=0;i<removeSel.length;i++){removeSel[i].selected=false;}
		for(i=0;i<addSel.length;i++){
			addSel[i].selected=true;
		}
		return dx.sel;
	},
	get publishProfile(){
		return new XML(this.doc.exportPublishProfileString());
	},
	set publishProfile(s){},
	get includeHiddenLayers(){
		return this.publishProfile.PublishFlashProperties.InvisibleLayer.valueOf()==1;
	},
	set exportHiddenLayer(s){},
	
};

this.dx=new DX();
dx.load(
	[
		'String',
		'Object',
		'Array',
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
		'Frame',
		'Layer',
		'Timeline',
		'Selection',
		'Clipboard'
	],
	true
);




