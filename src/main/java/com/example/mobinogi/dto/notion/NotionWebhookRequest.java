package com.example.mobinogi.dto.notion;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.util.List;
import java.util.Map;

@Data
public class NotionWebhookRequest {
    
    @JsonProperty("object")
    private String object; // "event"
    
    @JsonProperty("id")
    private String id;
    
    @JsonProperty("created_time")
    private String createdTime;
    
    @JsonProperty("last_edited_time")
    private String lastEditedTime;
    
    @JsonProperty("parent_id")
    private String parentId;
    
    @JsonProperty("type")
    private String type; // "page_updated", "page_created", "page_deleted"
    
    @JsonProperty("properties")
    private Map<String, Object> properties;
    
    @JsonProperty("url")
    private String url;
    
    @JsonProperty("archived")
    private Boolean archived;
    
    @Data
    public static class WebhookEvent {
        
        @JsonProperty("object")
        private String object;
        
        @JsonProperty("type")
        private String type;
        
        @JsonProperty("page")
        private PageUpdate page;
        
        @JsonProperty("workspace")
        private WorkspaceInfo workspace;
    }
    
    @Data
    public static class PageUpdate {
        
        @JsonProperty("id")
        private String id;
        
        @JsonProperty("created_time")
        private String createdTime;
        
        @JsonProperty("last_edited_time")
        private String lastEditedTime;
        
        @JsonProperty("parent")
        private ParentInfo parent;
        
        @JsonProperty("archived")
        private Boolean archived;
        
        @JsonProperty("properties")
        private Map<String, Object> properties;
        
        @JsonProperty("url")
        private String url;
    }
    
    @Data
    public static class ParentInfo {
        
        @JsonProperty("type")
        private String type;
        
        @JsonProperty("database_id")
        private String databaseId;
        
        @JsonProperty("page_id")
        private String pageId;
        
        @JsonProperty("workspace")
        private Boolean workspace;
    }
    
    @Data
    public static class WorkspaceInfo {
        
        @JsonProperty("id")
        private String id;
        
        @JsonProperty("name")
        private String name;
    }
}
