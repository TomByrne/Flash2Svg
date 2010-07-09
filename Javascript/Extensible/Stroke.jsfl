(function(ext){
	function ExtensibleStroke(stroke){
		var settings=new ext.Object({
			
		});
		settings.extend(stroke,1);
		ext.Object.apply(this,[settings]);
		if(this.shapeFill && !(this.shapeFill instanceof ext.Fill)){
			this.shapeFill=new ext.Fill(this.shapeFill);
		}
		return this;
	}
	ExtensibleStroke.prototype={
		__proto__:ext.Object.prototype,
		type:ExtensibleStroke
	}
	ext.extend({Stroke:ExtensibleStroke});
})(extensible)
