(function(ext){
	function Clipboard(){
		this.sourceMatrix=new ext.Matrix();
		return this;
	}
	Clipboard.prototype={
		copy:function(cut){
			var sel=ext.sel;
			var floaters=[];
			this.sourceMatrix=ext.viewMatrix;
			for(var i=0;i<sel.length;i++){
				if(
					i>0 && 
					sel[i].type==ext.Shape &&
					!(
						sel[i].isGroup ||
						sel[i].isDrawingObject ||
						sel[i].isOvalObject ||
						sel[i].isRectangleObject
					)
				){
					ext.sel=[sel[i]];
					ext.doc.union();
					ext.doc.arrange('back');
					sel[i]=ext.sel[0];
					floaters[i]=true;
				}else{
					floaters[i]=false;
				}
			}
			ext.sel=sel;
			if(cut){ 
				ext.doc.clipCut();
			}else{
				ext.doc.clipCopy();
			}
			if(!cut){
				for(var i=0;i<sel.length;i++){
					if(floaters[i]==true){
						ext.sel=[sel[i]];
						ext.doc.unGroup();
						sel[i]=ext.sel[0];
					}
				}
				ext.sel=sel;
			}
			return;
		},
		cut:function(){
			return this.copy(true);
		},
		paste:function(){
			ext.doc.clipPaste(true);
			var originalSelection=new ext.Selection(ext.sel);
			var sel=originalSelection.expandGroups();
			var groups=sel.getGroups();
			sel=sel.remove(groups);
			sel=groups.concat(sel);
			var mx=new ext.Array();
			for(var i=0;i<sel.length;i++){
				var gmx=sel[i].matrix.concat(this.sourceMatrix);
				mx.push(gmx.concat(ext.viewMatrix.invert()));
			}
			for(var i=0;i<sel.length;i++){
				if(!(sel[i].isGroup && sel[i].parent!==undefined)){
					sel[i].x=mx[i].tx;
					sel[i].y=mx[i].ty;
					sel[i].matrix=mx[i];
				}
			}
			ext.sel=originalSelection;
		}
	};
	ext.clipboard=new Clipboard();
})(extensible);

