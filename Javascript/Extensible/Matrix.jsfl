(function(ext){
	function ExtensibleMatrix(matrix){
		matrix=matrix || {};
		if(typeof(matrix)=='xml')matrix = matrix.toString(); // attribute normally
		if(typeof(matrix)=='string'){
			matrix = matrix.match(/[\d\.\-]*\d/g);
		}
		if(matrix instanceof Array){
			this.a=matrix[0]!=undefined?Number(matrix[0]):1;
			this.b=matrix[1]!=undefined?Number(matrix[1]):0;
			this.c=matrix[2]!=undefined?Number(matrix[2]):0;
			this.d=matrix[3]!=undefined?Number(matrix[3]):1;
			this.tx=matrix[4]!=undefined?Number(matrix[4]):0;
			this.ty=matrix[5]!=undefined?Number(matrix[5]):0;	
		}else{		
			this.a=matrix.a!=undefined?Number(matrix.a):1;
			this.b=matrix.b!=undefined?Number(matrix.b):0;
			this.c=matrix.c!=undefined?Number(matrix.c):0;
			this.d=matrix.d!=undefined?Number(matrix.d):1;
			this.tx=matrix.tx!=undefined?Number(matrix.tx):0;
			this.ty=matrix.ty!=undefined?Number(matrix.ty):0;
		}
		return this;
	}
	ExtensibleMatrix.prototype={
		__proto__:ext.Object.prototype,
		type:ExtensibleMatrix,
		is:function(m){
			return(
				m &&
				m.a==this.a &&
				m.b==this.b &&
				m.c==this.c &&
				m.d==this.d &&
				m.tx==this.tx && 
				m.ty==this.ty
			);
		},
		concat:function(matrix){
			if(!(matrix)){
				return this;
			}
			if(!(matrix instanceof this.type)){
				matrix=new this.type(matrix);
			}
			return new this.type(fl.Math.concatMatrix(this,new this.type(matrix)));
			/*return new this.type({
				a:(this.a*matrix.a)+(this.b*matrix.c),
				b:(this.a*matrix.b)+(this.b*matrix.d),
				c:(this.c*matrix.a)+(this.d*matrix.c),
				d:(this.c*matrix.b)+(this.d*matrix.d),
				tx:(this.tx*matrix.a)+(this.ty*matrix.c)+(matrix.tx),
				ty:(this.tx*matrix.b)+(this.ty*matrix.d)+(matrix.ty)
			});*/
		},
		invert:function(){
			return new this.type(fl.Math.invertMatrix(this));fl.trace(result);
			/*return new this.type({
				a:this.d/((this.a*this.d)-(this.b*this.c)),
				b:-this.b/((this.a*this.d)-(this.b*this.c)),
				c:-this.c/((this.a*this.d)-(this.b*this.c)),
				d:this.a/((this.a*this.d)-(this.b*this.c)),
				tx:((this.c*this.ty)-(this.d*this.tx))/((this.a*this.d)-(this.b*this.c)),
				ty:-((this.a*this.ty)-(this.b*this.tx))/((this.a*this.d)-(this.b*this.c))
			});*/
		},
		scale:function(scaleX,scaleY){
			this.scaleX=scaleX;
			this.scaleY=scaleY;
			return this;
		},
		get scaleX(){
			var vector=new ext.Point({x:this.a,y:this.b});
			return vector.length;
		},
		get scaleY(){
			var vector=new ext.Point({x:this.c,y:this.d});
			return vector.length;
		},
		set scaleX(s){
			var vector=new ext.Point({x:this.a,y:this.b});
			vector.length=s;
			this.a=vector.x;
			this.b=vector.y;
		},
		set scaleY(s){
			var vector=new ext.Point({x:this.c,y:this.d});
			vector.length=s;
			this.c=vector.x;
			this.d=vector.y;
		},
		roundTo:function(decimalPlaces){
			var multiplier=Math.pow(10,decimalPlaces);
			return new this.type({
				a:Math.round(this.a*multiplier)/multiplier,
				b:Math.round(this.b*multiplier)/multiplier,
				c:Math.round(this.c*multiplier)/multiplier,
				d:Math.round(this.d*multiplier)/multiplier,
				tx:Math.round(this.tx*multiplier)/multiplier,
				ty:Math.round(this.ty*multiplier)/multiplier
			});
		},
		transformPoint:function (x, y, doTranslate) {
		    var result = new ext.Point(
		        (x*this.a)+(y*this.b),
		        (x*this.c)+(y*this.d)
		    );
		    if(doTranslate==null || doTranslate){
		    	result.x += this.tx;
		    	result.y += this.ty;
		    }

		    return result;
		},
		clone:function (x, y, doTranslate) {
		    return new ext.Matrix([this.a, this.b, this.c, this.d, this.tx, this.ty]);
		},
		determinant:function() {
			return this.a * this.d - this.b * this.c;
		}
	}
	ext.extend({Matrix:ExtensibleMatrix});
})(extensible)
