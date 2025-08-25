# Use the official lightweight Nginx image from Docker Hub
FROM nginx:alpine

# Copy the default Nginx configuration file
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy the built static assets from the 'dist' folder to the Nginx server directory
# IMPORTANT: This assumes your build process creates a 'dist' folder. If it's different (e.g., 'build'), change 'dist' here.
COPY dist /usr/share/nginx/html

# Expose port 80 to the outside world
EXPOSE 80

# Command to run Nginx in the foreground when the container starts
CMD ["nginx", "-g", "daemon off;"]
