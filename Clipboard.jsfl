(function(dx){
	function Clipboard(){
		this.sourceMatrix=new dx.Matrix();
		return this;
	}
	Clipboard.prototype={
		copy:function(cut){
			var sel=dx.sel;
			var floaters=[];
			this.sourceMatrix=dx.viewMatrix;
			for(var i=0;i<sel.length;i++){
				if(i>0 && sel[i].type==dx.Shape && !(sel[i].isGroup || sel[i].isDrawingObject)){
					dx.sel=[sel[i]];
					dx.doc.union();
					dx.doc.arrange('back');
					sel[i]=dx.sel[0];
					floaters[i]=true;
				}else{
					floaters[i]=false;
				}
			}
			dx.sel=sel;
			if(cut){ 
				dx.doc.clipCut();
			}else{
				dx.doc.clipCopy();
			}
			if(!cut){
				for(var i=0;i<sel.length;i++){
					if(floaters[i]==true){
						dx.sel=[sel[i]];
						dx.doc.unGroup();
						sel[i]=dx.sel[0];
					}
				}
				dx.sel=sel;
			}
			return;
		},
		cut:function(){
			return this.copy(true);
		},
		paste:function(){
			dx.doc.clipPaste(true);
			var originalSelection=dx.sel;
			var sel=originalSelection.expandGroups();
			var groups=sel.getGroups();
			sel=sel.remove(groups);
			sel=groups.concat(sel);
			var mx=new dx.Array();
			for(var i=0;i<sel.length;i++){
				var gmx=sel[i].matrix.concat(this.sourceMatrix);
				mx.push(gmx.concat(dx.viewMatrix.invert()));
			}
			for(var i=0;i<sel.length;i++){
				if(!(sel[i].isGroup && sel[i].parent)){
					sel[i].x=mx[i].tx;
					sel[i].y=mx[i].ty;
					sel[i].matrix=mx[i];
				}
			}
			dx.sel=originalSelection;
		}
	};
	dx.clipboard=new Clipboard();
})(dx);

