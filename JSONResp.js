

exports.JSONResp = function(response) {
	this.r = {
		status: 0,
		ms: new Date(),
		data: {}
	};
	this.r.t = new Date().getTime();
	this.res = response;
	this.filters = [];

	this.filter = function(fnc){
		if(fnc!==undefined && fnc instanceof Function) {
		}
//console.log("#### adding filter: "+fnc);
		this.filters.push(fnc);
	};

	this.runFilters = function(){
		var self = this;
		this.filters.forEach(function(filter){
//console.log("#### runingfilter: "+filter);
			filter.apply(self, [self]);
		});
	};

	this.param = function(prop, val){
		if(val!==undefined) {
			this.r[prop] = val;
		}
		return this.r[prop];
	};

	this.data = function(d) {
		this.r.data = d;
	};

	this.err = function(e, errcode) {
		this.r.status = errcode || 1;
		this.r.err = {};
		if (typeof e === "object") {
			this.r.err = e;
		}
		this.r.err.msg = e.msg ? e.msg : e.message ? e.message : "" + e;
		this._sendit();
	};

	this.send = function(items, compact) {
		var comp = compact || false;
		var obj = items;
		if (comp === true && items instanceof Array && items.length == 1) {
			obj = items[0];
		}
		/*
		 if(obj instanceof Array && obj.length==0){
		 obj=null;
		 }
		 */
		if (obj === null || obj === undefined) {
			this.r.status = 2;
			this.r.err = {
				message: "Nothing found"
			}
		}
		else if (obj !== undefined) {
			this.r.data = obj;
			this.r.status = 0;
		}
		this._sendit();
	};

	this._sendit = function(){
		if (this.res !== undefined) {
			this.runFilters();
			this.res.set('Content-Type', 'application/json');
			this.r.ms = (new Date().getTime()) - this.r.t;
			this.res.send(this.r);
		}
	};
};
