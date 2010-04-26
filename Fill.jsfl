(function(dx){
	function ExtensibleFill(fill){
		if(arguments.length==0){fill=document.getCustomFill();}		
		dx.Object.apply(this,[fill]);
		if(this.colorArray){this.colorArray=new dx.Array(this.colorArray);}
		if(this.matrix){this.matrix=new dx.Matrix(this.matrix);}
		if(this.posArray){this.posArray=new dx.Array(this.posArray);}
		return this;
	}
	ExtensibleFill.prototype={
		__proto__:dx.Object.prototype,
		type:ExtensibleFill,
		//methods
		is:function(f){
			if(this.style!=f.style){
				return false;
			}else if(this.style=='bitmap'){
				if(this.bitmapPath!=f.bitmapPath){return false;}
			}else if(this.style=='linearGradient' || this.style=='radialGradient'){
				if(!this.colorArray.is(f.colorArray)){return false;}
				if(!this.posArray.is(f.posArray)){return false;}
				if(this.style=='radialGradient' && this.focalPoint!=f.focalPoint){return false;}
				if(this.linearRGB!=f.linearRGB){return false;}
			}else if(this.style=='solid'){
				if(this.color!=f.color){return false;}
			}
			if(this.style=='bitmap' || this.style=='linearGradient' || this.style=='radialGradient'){
				if(this.matrix.a!=f.matrix.a){return false;}
				if(this.matrix.b!=f.matrix.b){return false;}
				if(this.matrix.c!=f.matrix.c){return false;}
				if(this.matrix.d!=f.matrix.d){return false;}
				if(this.matrix.tx!=f.matrix.tx){return false;}
				if(this.matrix.ty!=f.matrix.ty){return false;}
			}
			return true;
		}
	}
	dx.extend({Fill:ExtensibleFill});
})(dx)
