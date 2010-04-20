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
		$:Object,
		type:ExtensibleStroke,
		//methods
		is:function(s){
			for(var property in this){
				if(property!='shapeFill' && property!='color'){
					if(this[property]!=s[property]){return false;}
				}
			}
			if(this.shapeFill){
				if(!this.shapeFill.is(s.shapeFill)){return false;}
			}else{
				if(this.color!=s.color){return false;}
			}
			return true;
		},
		getSVG:function(){
			var color=new dx.Color(this.color);
			var svg='';
			//if(this.fill && this.fill!='noFill'){
				
			//}else{
				svg+='stroke="'+color.hex+'" ';
				svg+='stroke-opacity="'+(color.alpha/255.0)+'" ';
			//}
			svg+='stroke-width="'+this.thickness+'" ';
			svg+='stroke-linecap="'+(this.capType=='none'?'round':this.capType)+'" ';
			svg+='stroke-linejoin="'+this.joinType+'" ';
			if(this.joinType=='miter'){svg+='stroke-miterlimit="'+this.miterLimit+'" ';}
			
			if(this.scaleType=='none'){
				svg+='vector-effect="non-scaling-stroke" ';
			}
			return svg;
		}

	}
	dx.extend({Stroke:ExtensibleStroke});
})(dx)
