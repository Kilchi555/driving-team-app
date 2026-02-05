-- Insert SVG icon for Auto category
-- This is a custom SVG icon stored in the icon_svg column

UPDATE public.categories 
SET icon_svg = '<svg width="55" height="55" viewBox="0 0 55 55" xmlns="http://www.w3.org/2000/svg"><image width="55" height="55" href="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAgAAAAIACAYAAAD0eNT6AAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAOhgAADoYBFfSI+wAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAACAASURBVHic7d113OVFmffx79KEAAKiGBgESYJERUWQMQIKKibANJjH7DvmUWcMiKKIcdQRcwBFxACiglBRQUFBAUZBQRFMBEEEUYJAP+8ftZvuhu7mhlN7n3Pq+1nrroZldz0P1667fqf23lWRmUiSpLYsGLoB" preserveAspectRatio="none" style="image-rendering:optimizeQuality"/></svg>'
WHERE name ILIKE '%auto%' OR code = 'AUTO';
