(function(dx){
	function ExtensibleFill(fill){
		if(!fill){
			fill=document.getCustomFill();
		}
		dx.Object.apply(this,[fill]);
		return this;
	}
	ExtensibleFill.prototype={
		__proto__:dx.Object.prototype,
		$:Object,//Fill
		type:ExtensibleFill,
		//built in methods
		//built in properties
		get bitmapIsClipped(){return this.$.bitmapIsClipped;},
		set bitmapIsClipped(s){this.$.bitmapIsClipped=s;},
		get bitmapPath(){return this.$.bitmapPath;},
		set bitmapPath(s){this.$.bitmapPath=s;},
		get color(){return this.$.color;},
		set color(s){this.$.color=s;},
		get colorArray(){return this.$.colorArray;},
		set colorArray(s){this.$.colorArray=s;},
		get focalPoint(){return this.$.focalPoint;},
		set focalPoint(s){this.$.focalPoint=s;},
		get linearRGB(){return this.$.linearRGB;},
		set linearRGB(s){this.$.linearRGB=s;},
		get matrix(){return this.$.matrix;},
		set matrix(s){this.$.matrix=s;},
		get overflow(){return this.$.overflow;},
		set overflow(s){this.$.overflow=s;},
		get posArray(){return this.$.posArray;},
		set posArray(s){this.$.posArray=s;},
		get style(){return this.$.style;},
		set style(s){this.$.style=s;},
		//methods
		is:function(f){
			if(this.style!=f.style){return false;}
			if(this.style=='bitmap'){
				if(this.bitmapPath!=f.bitmapPath){return false;}
			}else if(this.style=='linearGradient' || this.style=='radialGradient'){
				for(var i=0;i<this.colorArray.length;i++){
					if(this.colorArray[i]!=f.colorArray[i]){return false;}
				}
				for(var i=0;i<this.posArray.length;i++){
					if(this.posArray[i]!=f.posArray[i]){return false;}
				}
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
