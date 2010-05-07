(function(dx){
	function ExtensibleFill(fill){
		var settings=new dx.Object({
			style:'solid',
			color:'#000000',
			bitmapIsClipped:undefined,
			bitmapPath:undefined,
			colorArray:undefined,
			focalPoint:undefined,
			linearRGB:undefined,
			matrix:undefined,
			overflow:undefined,
			posArray:undefined
		});
		if(typeof fill=='string'){
			settings.color=fill;
		}else{
			settings.extend(fill);
		}
		dx.Object.apply(this,[settings]);
		if(this.matrix && !(this.matrix instanceof dx.Matrix)){
			this.matrix=new dx.Matrix(this.matrix);
		}
		return this;
	}
	ExtensibleFill.prototype={
		__proto__:dx.Object.prototype,
		type:ExtensibleFill,
		is:function(f){
			if(this.style!=f.style){
				return false;
			}else if(this.style=='bitmap'){
				if(this.bitmapPath!=f.bitmapPath){return false;}
			}else if(this.style=='linearGradient' || this.style=='radialGradient'){
				if(
					!this.colorArray.is(f.colorArray) ||
					!this.posArray.is(f.posArray) ||
					(this.style=='radialGradient' && this.focalPoint!=f.focalPoint) ||
					this.linearRGB!=f.linearRGB
				){
					return false;
				}
			}else if(this.style=='solid'){
				if(this.color!=f.color){return false;}
			}
			if(
				(
					this.style=='bitmap' ||
					this.style=='linearGradient' ||
					this.style=='radialGradient'
				) && 
				!this.matrix.is(f.matrix)
			){
				return false;
			}
			return true;
		}
	}
	dx.extend({Fill:ExtensibleFill});
})(dx)
