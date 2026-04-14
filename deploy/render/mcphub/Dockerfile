FROM samanhappy/mcphub:0.12.12

# Keep template in image and render concrete config from env at startup.
COPY mcp_settings.render.json /app/mcp_settings.template.json
COPY render-entrypoint.sh /app/render-entrypoint.sh
RUN chmod +x /app/render-entrypoint.sh

ENTRYPOINT ["/app/render-entrypoint.sh"]
CMD ["pnpm", "start"]
