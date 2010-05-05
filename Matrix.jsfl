(function(dx){
	function ExtensibleMatrix(matrix){
		matrix=matrix||{};
		this.a=matrix.a||1;
		this.b=matrix.b||0;
		this.c=matrix.c||0;
		this.d=matrix.d||1;
		this.tx=matrix.tx||0;
		this.ty=matrix.ty||0;
		return this;
	}
	ExtensibleMatrix.prototype={
		__proto__:dx.Object.prototype,
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
		concat:function(m){
			return new this.type(fl.Math.concatMatrix(this,new this.type(m)));
		},
		invert:function(){
			return new this.type(fl.Math.invertMatrix(this));
		}
	}
	dx.extend({Matrix:ExtensibleMatrix});
})(dx)
