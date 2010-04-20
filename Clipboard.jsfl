(function(dx){
	function Clipboard(){
		this.viewMatrix=new dx.Object({a:1, b:0, c:0, d:1, tx:0, ty:0});
		return this;
	}
	Clipboard.prototype={
		copy:function(cut){
			var doc=fl.getDocumentDOM();
			var sel=dx.sel;
			var floaters=[];
			this.libraryItem="";
			this.viewMatrix=dx.doc.viewMatrix;
			this.rectangle=dx.doc.getSelectionRect();
			for(var i=0;i<sel.length;i++){
				if(i>0 && sel[i].type==dx.Shape && !(sel[i].isGroup || sel[i].isDrawingObject)){
					dx.sel=[sel[i]];
					fl.getDocumentDOM().union();
					fl.getDocumentDOM().arrange('back');
					sel[i]=dx.sel[0];
					floaters[i]=true;
				}else{
					floaters[i]=false;
				}
			}
			dx.sel=sel;
			if(cut){ 
				doc.clipCut();
			}else{
				doc.clipCopy();
			}
			if(!cut){
				for(var i=0;i<sel.length;i++){
					if(floaters[i]==true){
						dx.sel=[sel[i]];
						fl.getDocumentDOM().unGroup();
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
			var doc=dx.doc;
			dx.doc.clipPaste(true);
			var s=dx.sel;
			var sel=new dx.Selection();
			for(var i=0;i<s.length;i++){
				if(s[i].$.constructor.name=='SymbolInstance' || !s[i].isGroup || s[i].isDrawingObject){
					var gmx=fl.Math.concatMatrix(s[i].matrix,this.viewMatrix);
					var mx=fl.Math.concatMatrix(gmx,fl.Math.invertMatrix(dx.doc.viewMatrix));				
					s[i].matrix=mx;
				}else{			
					sel.push(s[i]);
				}
			}
			if(sel.length){
				dx.sel=sel;
				var nx={a:1, b:0, c:0, d:1, tx:0, ty:0};
				var vm=this.viewMatrix;
				var im=fl.Math.invertMatrix(dx.doc.viewMatrix);
				var mx=fl.Math.concatMatrix(im,vm);
				dx.doc.transformSelection(mx.a,mx.b,mx.c,mx.d);
				dx.doc.moveSelectionBy({x:-mx.tx,y:-mx.ty});
				var sel=dx.sel;
			}
			dx.sel=s;
		}
	};
	dx.clipboard=new Clipboard();
})(dx);

