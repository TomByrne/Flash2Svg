(function(ext){
	function Color(){
		var args=Array.prototype.slice.call(arguments);
		this.amount=new ext.Array([0,0,0,0]);
		this.percent=new ext.Array([100,100,100,100]);
		if(args.length==1){
			if(args[0] instanceof this.type){
				ext.Object.apply(this,args);
			}else if(args[0] instanceof ext.Fill){
				this.hex=args[0].color;
			}else if(args[0] instanceof ext.Shape){
				this.hex=args[0].contours[0].color;
			}else{
				var sel=args[0].$?args[0].$:args[0];
				switch(sel.constructor.name){
					case 'SymbolInstance':
						var rgba=[
							'colorRedAmount',
							'colorGreenAmount',
							'colorBlueAmount',
							'colorAlphaAmount'
						];
						var rgbaX=[
							'colorRedPercent',
							'colorGreenPercent',
							'colorBluePercent',
							'colorAlphaPercent'
						];
						for(var n=0;n<4;n++){this.amount[n]=sel[rgba[n]];}
						for(var n=0;n<4;n++){this.percent[n]=sel[rgbaX[n]];}
						break;
					case 'Shape':
						var sh=new ext.Shape(sel);
						this.hex=sh.contours[0].fill.color;
						break;
					case 'String':
						this.hex=sel;
				}
			}
		}
		return this;
	};
	Color.prototype={
		__proto__:ext.Object.prototype,
		type:Color,
		set hex(hstring){
			var hexDigit=['0','1','2','3','4','5','6','7','8','9','A','B','C','D','E','F'];
			if(hstring[0]=="#") hstring=hstring.slice(1);
			this.amount.clear();
			for(var i=0;i<hstring.length;i+=2){
				this.amount.push(hexDigit.indexOf(hstring[i].toUpperCase())*16.0+hexDigit.indexOf(hstring[i+1].toUpperCase()));
			}
			while(this.amount.length<4){this.amount.push(255);}
			return this;
		},
		get hex(alpha){
			alpha=alpha||false;
			var c=this.amount;
			for(var i=0;i<c.length;i++){
				if(c[i]>255){c[i]=255;}
				if(c[i]<0){c[i]=0;}
			}
			var hexDigit=['0','1','2','3','4','5','6','7','8','9','A','B','C','D','E','F'];
			var hstring="#";
			for(var i=0;i<c.length-(alpha?0:1);i++){
				hstring+=(
					hexDigit[Math.floor((c[i])/16.0)]+
					hexDigit[Math.round(c[i]-16.0*Math.floor(c[i]/16.0))]
				);
			}
			return hstring;
		},
		set red(value){this.amount[0]=value;},
		get red(){return this.amount[0];},
		set green(value){this.amount[1]=value;},
		get green(){return this.amount[1];},
		set blue(value){this.amount[2]=value;},
		get blue(){return this.amount[2];},
		set alpha(value){this.amount[3]=value;},
		get alpha(){return this.amount[3];},
		set r(value){this.amount[0]=value;},
		get r(){return this.amount[0];},
		set g(value){this.amount[1]=value;},
		get g(){return this.amount[1];},
		set b(value){this.amount[2]=value;},
		get b(){return this.amount[2];},
		set a(value){this.amount[3]=value;},
		get a(){return this.amount[3];},
		get opacity(){return this.amount[3]/255.0;},
		set opacity(s){this.amount[3]=s*255.0;},
		//methods
		transform:function(c){
			var c=new this.type(c);
			var color=new this.type(this);
			color.amount[0]=color.amount[0]*(c.percent[0]/100.0)+c.amount[0];
			color.amount[1]=color.amount[1]*(c.percent[1]/100.0)+c.amount[1];
			color.amount[2]=color.amount[2]*(c.percent[2]/100.0)+c.amount[2];
			color.amount[3]=color.amount[3]*(c.percent[3]/100.0)+c.amount[3];
			for(var i=0;i<color.amount.length;i++){
				if(color.amount[i]>255){color.amount[i]=255;}
				if(color.amount[i]<-255){color.amount[i]=-255;}
			}
			return color;
		},
		get idString(){
			var str='';
			if(!this.amount.is([0,0,0,0])){
				for(var i=0;i<this.amount.length;i++){
					var s=String(this.amount[i]);
					while(s.length<3){s='0'+s;}
					str+=s;
				}
			}
			if(!this.percent.is([100,100,100,100])){
				str+='x';
				for(var i=0;i<this.percent.length;i++){
					s=String(this.percent[i]);
					while(s.length<3){s='0'+s;}
					str+=s;
				}
			}
			return str; 
		},
		set idString(){}
	};
	ext.extend({
		Color:Color
	});
})(extensible)
