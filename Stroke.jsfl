(function(ext){
	function ExtensibleStroke(stroke){
		ext.Object.apply(this,[stroke]);
		if(this.shapeFill && !(this.shapeFill instanceof ext.Fill)){
			this.shapeFill=new ext.Fill(this.shapeFill);
		}else if(this.shapeFill){
			this.shapeFill=this.shapeFill;
		}
		return this;
	}
	ExtensibleStroke.prototype={
		__proto__:ext.Object.prototype,
		type:ExtensibleStroke
	}
	ext.extend({Stroke:ExtensibleStroke});
})(extensible)
