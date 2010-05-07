(function(dx){
	function ExtensibleStroke(stroke){
		dx.Object.apply(this,[stroke]);
		if(this.shapeFill && !(this.shapeFill instanceof dx.Fill)){
			this.shapeFill=new dx.Fill(this.shapeFill);
		}else if(this.shapeFill){
			this.shapeFill=this.shapeFill;
		}
		return this;
	}
	ExtensibleStroke.prototype={
		__proto__:dx.Object.prototype,
		type:ExtensibleStroke
	}
	dx.extend({Stroke:ExtensibleStroke});
})(dx)
