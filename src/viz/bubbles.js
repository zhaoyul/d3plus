vizwhiz.bubbles = function(data,vars) {

  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // Private Variables
  //-------------------------------------------------------------------
  
  var groups = {},
      donut_size = 0.4,
      title_height = vars.small ? 0 : 30,
      arc_offset = vars.donut ? donut_size : 0,
      sort_order = vars.sort == "value" ? vars.value_var : vars.sort;
      
  var arc = d3.svg.arc()
    .startAngle(0)
    .innerRadius(function(d) { return d.arc_inner })
    .outerRadius(function(d) { return d.arc_radius })
    .endAngle(function(d) { return d.arc_angle });
  
  var arc_else = d3.svg.arc()
    .startAngle(0)
    .innerRadius(function(d) { return d.arc_inner_else })
    .outerRadius(function(d) { return d.arc_radius_else })
    .endAngle(function(d) { return d.arc_angle_else });
  
  var arc_bg = d3.svg.arc()
    .startAngle(0)
    .innerRadius(function(d) { return d.arc_inner_bg })
    .outerRadius(function(d) { return d.arc_radius_bg })
    .endAngle(360);
  
  //===================================================================
  
  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // Calculate positioning for each bubble
  //-------------------------------------------------------------------
  
  var data_nested = {}
  data_nested.key = "root";
  data_nested.values = d3.nest()
    .key(function(d){ return d[vars.grouping] })
    .entries(data)

  var pack = d3.layout.pack()
    .size([vars.width,vars.height])
    .children(function(d) { return d.values; })
    .padding(5)
    .value(function(d) { return d[vars.value_var]; })
    .sort(function(a,b) { 
      if (a.values && b.values) return a.values.length - b.values.length;
      else return a[vars.value_var] - b[vars.value_var];
    })
  
  var data_packed = pack.nodes(data_nested)
    .filter(function(d){
      if (d.depth == 1) {
        if (d.children.length == 1 ) {
          d[vars.text_var] = d.children[0][vars.text_var];
          d.category = d.children[0].category;
        }
        else {
          d[vars.text_var] = d.key;
          d.category = d.key;
        }
        d[vars.value_var] = d.value;
      }
      return d.depth == 1;
    })
    .sort(function(a,b){
      if (typeof a[sort_order] == "number") {
        if(a[sort_order] < b[sort_order]) return 1;
        if(a[sort_order] > b[sort_order]) return -1;
      }
      else {
        if(a[sort_order] < b[sort_order]) return -1;
        if(a[sort_order] > b[sort_order]) return 1;
      }
      return 0;
    })
  
  if(data_packed.length == 1) {
    var columns = 1,
        rows = 1;
  }
  else if (data_packed.length < 4) {
    var columns = data_packed.length,
        rows = 1;
  } 
  else {
    var rows = Math.ceil(Math.sqrt(data_packed.length/(vars.width/vars.height))),
        columns = Math.ceil(Math.sqrt(data_packed.length*(vars.width/vars.height)));
  }
  
  while ((rows-1)*columns >= data_packed.length) rows--
  

  
  var max_size = d3.max(data_packed,function(d){return d.r;})*2,
      downscale = (d3.min([vars.width/columns,(vars.height/rows)-title_height])*0.9)/max_size;
  
  var r = 0, c = 0;
  data_packed.forEach(function(d){
    
    if (d.depth == 1) {
      
      if (vars.grouping != "active") {
        var color = d.children[0].color;
      }
      else {
        var color = "#cccccc";
      }
      
      color = d3.rgb(color).hsl()
      if (color.s > 0.9) color.s = 0.75
      while (color.l > 0.75) color = color.darker()
      color = color.rgb()
      
      groups[d.key] = {};
      groups[d.key].color = color;
      groups[d.key].children = d.children.length;
      groups[d.key].key = d.key;
      groups[d.key][vars.text_var] = d[vars.text_var];
      groups[d.key].x = ((vars.width/columns)*c)+((vars.width/columns)/2);
      groups[d.key].y = ((vars.height/rows)*r)+((vars.height/rows)/2)+(title_height/2);
      groups[d.key].width = (vars.width/columns);
      groups[d.key].height = (vars.height/rows);
      groups[d.key].r = d.r*downscale;

      if (c < columns-1) c++
      else {
        c = 0
        r++
      }
      
    }
    
  })
  
  data.forEach(function(d){
    var parent = data_packed.filter(function(p){ 
      if (d[vars.grouping] === false) var key = "false";
      else if (d[vars.grouping] === true) var key = "true";
      else var key = d[vars.grouping]
      return key == p.key 
    })[0]
    d.x = (downscale*(d.x-parent.x))+groups[parent.key].x;
    d.y = (downscale*(d.y-parent.y))+groups[parent.key].y;
    d.r = d.r*downscale;
  })
    
  //===================================================================
  
  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // Set up initial SVG groups
  //-------------------------------------------------------------------
    
  vars.parent_enter.append('g')
    .attr('class','groups');
    
  vars.parent_enter.append('g')
    .attr('class','bubbles');
    
  vars.parent_enter.append('g')
    .attr('class','labels');
    
  //===================================================================
  
  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // New labels enter, initialize them here
  //-------------------------------------------------------------------

  if (vars.small) groups = {};

  var group = d3.select("g.groups").selectAll("g.group")
    .data(d3.values(groups),function(d){ return d.key })
    
  group.enter().append("g")
    .attr("class", "group")
    .attr("transform", function(d){ return "translate("+d.x+","+d.y+")"; })
    .each(function(d){
      
      if (vars.grouping == "active") {
        var t = d[vars.text_var] == "true" ? "Fully "+vars.active_var : "Not Fully "+vars.active_var
      } else {
        var t = d[vars.text_var]
      }
        
      d3.select(this).append("text")
        .attr("opacity",0)
        .attr("text-anchor","middle")
        .attr("font-weight","bold")
        .attr("font-size","12px")
        .attr("font-family","Helvetica")
        .attr("fill",d.color)
        .attr('x',0)
        .attr('y',function(dd) {
          return -(d.height/2)-title_height/4;
        })
        .each(function(){
          vizwhiz.utils.wordwrap({
            "text": t,
            "parent": this,
            "width": d.width,
            "height": 30
          })
        })
      
    });
    
  group.transition().duration(vizwhiz.timing)
    .attr("transform", function(d){ return "translate("+d.x+","+d.y+")"; })
    .each(function(d){
      
      if (vars.group_bgs && d.children > 1) {
        
        var bg = d3.select(this).selectAll("circle")
          .data([d]);
        
        bg.enter().append("circle")
          .attr("fill", d.color )
          .attr("stroke",d.color)
          .attr("stroke-width",1)
          .style('fill-opacity', 0.1 )
          .attr("opacity",0)
          .attr("r",d.r)
        
        bg.transition().duration(vizwhiz.timing)
          .attr("opacity",1)
          .attr("r",d.r);
          
      } else {
        d3.select(this).select("circle").transition().duration(vizwhiz.timing)
          .attr("opacity",0)
          .remove();
      }
      
      d3.select(this).select("text").transition().duration(vizwhiz.timing)
        .attr("opacity",1)
      
    });
    
  group.exit().transition().duration(vizwhiz.timing)
    .each(function(d){
      
      if (vars.group_bgs) {
        d3.select(this).select("circle").transition().duration(vizwhiz.timing)
          .attr("r",0)
          .attr("opacity",0);
      }
      
      d3.select(this).selectAll("text").transition().duration(vizwhiz.timing)
        .attr("opacity",0);
        
    }).remove();
    
  //===================================================================
  
  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // New bubbles enter, initialize them here
  //-------------------------------------------------------------------

  var bubble = d3.select("g.bubbles").selectAll("g.bubble")
    .data(data,function(d){ return d[vars.id_var] })
    
  bubble.enter().append("g")
    .attr("class", "bubble")
    .attr("transform", function(d){ return "translate("+d.x+","+d.y+")"; })
    .on(vizwhiz.evt.over, function(d){
      
      var tooltip_data = {}
      vars.tooltip_info.forEach(function(t){
        if (d[t]) tooltip_data[t] = d[t]
      })
      
      vizwhiz.tooltip.create({
        "parent": vars.svg,
        "id": d[vars.id_var],
        "data": tooltip_data,
        "title": d[vars.text_var],
        "x": d.x,
        "y": d.y,
        "offset": d.r,
        "arrow": true
      })
      
    })
    .on(vizwhiz.evt.out, function(d){
      vizwhiz.tooltip.remove(d[vars.id_var])
    })
    .each(function(d){
      
      vars.arc_sizes[d[vars.id_var]+"_bg"] = 0
      vars.arc_inners[d[vars.id_var]+"_bg"] = 0
      
      d3.select(this).append("path")
        .attr("class","bg")
        .attr("fill", d.color )
        .attr("stroke", d.color )
        .attr("stroke-width",1)
        .style('fill-opacity', 0.1 )
      
      d3.select(this).select("path.bg").transition().duration(vizwhiz.timing)
        .attrTween("d",arcTween_bg)
    
      if (d.elsewhere) {
    
        vars.arc_angles[d[vars.id_var]+"_else"] = 0
        vars.arc_sizes[d[vars.id_var]+"_else"] = 0
        vars.arc_inners[d[vars.id_var]+"_else"] = 0
      
        d3.select(this).append("path")
          .attr("class","elsewhere")
          .style('fill', d.color )
          .style('fill-opacity', 0.5 )
      
        d3.select(this).select("path.elsewhere").transition().duration(vizwhiz.timing)
          .attrTween("d",arcTween_else)
      }
      
      vars.arc_angles[d[vars.id_var]] = 0
      vars.arc_sizes[d[vars.id_var]] = 0
      vars.arc_inners[d[vars.id_var]] = 0
      
      d3.select(this).append("path")
        .each(function(dd) { dd.arc_id = dd[vars.id_var]; })
        .attr("class","available")
        .style('fill', d.color )
      
      d3.select(this).select("path.available").transition().duration(vizwhiz.timing)
        .attrTween("d",arcTween)
        
    });
  
  //===================================================================
  
  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // Update, for things that are already in existance
  //-------------------------------------------------------------------
    
  bubble.transition().duration(vizwhiz.timing)
    .attr("transform", function(d){ return "translate("+d.x+","+d.y+")"; })
    .each(function(d){
    
      if (vars.donut) d.arc_inner_bg = d.r*arc_offset;
      else d.arc_inner_bg = 0;
      d.arc_radius_bg = d.r;
      
      d3.select(this).select("path.bg").transition().duration(vizwhiz.timing)
        .attrTween("d",arcTween_bg)
        .each("end", function() {
          vars.arc_sizes[d[vars.id_var]+"_bg"] = d.arc_radius_bg
          vars.arc_inners[d[vars.id_var]+"_bg"] = d.arc_inner_bg
        })
        
        
      var arc_start = d.r*arc_offset;
      
      d.arc_inner = arc_start+((d.r-arc_start)*0.25);
      d.arc_radius = arc_start+((d.r-arc_start)*0.75);
    
      if (d.total) d.arc_angle = (((d[vars.active_var] / d.total)*360) * (Math.PI/180));
      else if (d.active) d.arc_angle = 360; 

      d3.select(this).select("path.available").transition().duration(vizwhiz.timing)
        .attrTween("d",arcTween)
        .each("end", function() {
          vars.arc_angles[d[vars.id_var]] = d.arc_angle
          vars.arc_sizes[d[vars.id_var]] = d.arc_radius
          vars.arc_inners[d[vars.id_var]] = d.arc_inner
        })
    
      if (d.elsewhere) {
      
        d.arc_inner_else = arc_start;
        d.arc_radius_else = d.r;
        d.arc_angle_else = d.arc_angle + (((d.elsewhere / d.total)*360) * (Math.PI/180));
      
        d3.select(this).select("path.elsewhere").transition().duration(vizwhiz.timing)
          .attrTween("d",arcTween_else)
          .each("end", function() {
            vars.arc_angles[d[vars.id_var]+"_else"] = d.arc_angle_else
            vars.arc_sizes[d[vars.id_var]+"_else"] = d.arc_radius_else
            vars.arc_inners[d[vars.id_var]+"_else"] = d.arc_inner_else
          })
      }
      
    })
      
  //===================================================================
  
  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // Exit, for nodes and links that are being removed
  //-------------------------------------------------------------------

  bubble.exit().transition().duration(vizwhiz.timing)
    .each(function(d){
    
      d.arc_radius_bg = 0;
      d.arc_inner_bg = 0;
      
      d3.select(this).select("path.bg").transition().duration(vizwhiz.timing)
        .attrTween("d",arcTween_bg)
        .each("end", function() {
          vars.arc_sizes[d[vars.id_var]+"_bg"] = d.arc_radius_bg
          vars.arc_inners[d[vars.id_var]+"_bg"] = d.arc_inner_bg
        })
    
      d.arc_radius = 0;
      d.arc_angle = 0; 
      d.arc_inner = 0;

      d3.select(this).select("path.available").transition().duration(vizwhiz.timing)
        .attrTween("d",arcTween)
        .each("end", function() {
          vars.arc_angles[d[vars.id_var]] = d.arc_angle
          vars.arc_sizes[d[vars.id_var]] = d.arc_radius
          vars.arc_inners[d[vars.id_var]] = d.arc_inner
        })
    
      if (d.elsewhere) {
      
        d.arc_angle_else = 0;
        d.arc_radius_else = 0;
        d.arc_inner_else = 0;
      
        d3.select(this).select("path.elsewhere").transition().duration(vizwhiz.timing)
          .attrTween("d",arcTween_else)
          .each("end", function(dd) {
            vars.arc_angles[d[vars.id_var]+"_else"] = d.arc_angle_else
            vars.arc_sizes[d[vars.id_var]+"_else"] = d.arc_radius_else
            vars.arc_inners[d[vars.id_var]+"_else"] = d.arc_inner_else
          })
      }

      d3.select(this).select("circle.hole").transition().duration(vizwhiz.timing)
        .attr("r", 0)
      
    })
    .remove();

  //===================================================================
  
  function arcTween(b) {
    var i = d3.interpolate({arc_angle: vars.arc_angles[b[vars.id_var]], arc_radius: vars.arc_sizes[b[vars.id_var]], arc_inner: vars.arc_inners[b[vars.id_var]]}, b);
    return function(t) {
      return arc(i(t));
    };
  }
  
  function arcTween_else(b) {
    var i = d3.interpolate({arc_angle_else: vars.arc_angles[b[vars.id_var]+"_else"], arc_radius_else: vars.arc_sizes[b[vars.id_var]+"_else"], arc_inner_else: vars.arc_inners[b[vars.id_var]+"_else"]}, b);
    return function(t) {
      return arc_else(i(t));
    };
  }
  
  function arcTween_bg(b) {
    var i = d3.interpolate({arc_radius_bg: vars.arc_sizes[b[vars.id_var]+"_bg"], arc_inner_bg: vars.arc_inners[b[vars.id_var]+"_bg"]}, b);
    return function(t) {
      return arc_bg(i(t));
    };
  }

  //===================================================================
};
