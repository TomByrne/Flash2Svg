//DAVID BELAIS 2009 DAVID@DISSENTGRAPHICS.COM
//MIT LICENSE

function DX(options){
	for(var o in options){this[o]=options[o];}
	this.modules=[];
	return this;
}
DX.prototype={
	get doc(){
		return fl.getDocumentDOM();
	},
	get dir(){
		return(fl.scriptURI.replace(/\/[^\/]*?$/g,""));
	},
	get timeline(){
		return new dx.Timeline(dx.doc.getTimeline());
	},
	get frame(){
		return dx.timeline.currentFrame;
	},
	get layer(){
		return dx.timeline.currentLayer;
	},
	get lib(){
		return(dx.doc.library);
	},
	get sel(){
		return(new dx.Selection(dx.doc.selection));
	},
	set sel(s){
		s=new dx.Array(s);
		var removeSel=dx.sel.remove(s);
		var addSel=s.remove(dx.sel);
		for(i=0;i<removeSel.length;i++){removeSel[i].selected=false;}
		for(i=0;i<addSel.length;i++){
			if(addSel[i] instanceof Element){
				addSel[i].selected=true;
			}
		}
		return dx.sel;
	},
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
	}
};

this.dx=new DX();
dx.load(
	[
		'String',
		'Object',
		'Array',
		'Selection',
		'Clipboard',
		'Color',
		'Timeline'
	],
	true
);




