(function(dx){
	function ExtensibleMatrix(matrix){
		this.a=1;
		this.b=0;
		this.c=0;
		this.d=1;
		this.tx=0;
		this.ty=0;
		dx.Object.apply(this,[matrix]);
		return this;
	}
	ExtensibleMatrix.prototype={
		__proto__:dx.Object.prototype,
		type:ExtensibleMatrix,
		is:function(m){
			return(
				m.a==this.a &&
				m.b==this.b &&
				m.c==this.c &&
				m.d==this.d &&
				m.tx==this.tx && 
				m.ty==this.ty
			);
		},
		concat:function(m){
			return new this.type(fl.Math.concatMatrix(this,new this.type(m)));
		},
		invert:function(){
			return new this.type(fl.Math.invertMatrix(this));
		}
	}
	dx.extend({Matrix:ExtensibleMatrix});
})(dx)
