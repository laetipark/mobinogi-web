package com.example.mobinogi.dto.notion;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.util.List;
import java.util.Map;

@Data
public class NotionDatabaseResponse{
	
	@JsonProperty("object")
	private String object;
	
	@JsonProperty("results")
	private List<NotionPage> results;
	
	@JsonProperty("next_cursor")
	private String nextCursor;
	
	@JsonProperty("has_more")
	private boolean hasMore;
	
	@JsonProperty("type")
	private String type;
	
	@Data
	public static class NotionPage{
		
		@JsonProperty("object")
		private String object;
		
		@JsonProperty("id")
		private String id;
		
		@JsonProperty("created_time")
		private String createdTime;
		
		@JsonProperty("last_edited_time")
		private String lastEditedTime;
		
		@JsonProperty("created_by")
		private Map<String, Object> createdBy;
		
		@JsonProperty("last_edited_by")
		private Map<String, Object> lastEditedBy;
		
		@JsonProperty("cover")
		private Object cover;
		
		@JsonProperty("icon")
		private Object icon;
		
		@JsonProperty("parent")
		private Map<String, Object> parent;
		
		@JsonProperty("archived")
		private boolean archived;
		
		@JsonProperty("properties")
		private Map<String, NotionProperty> properties;
		
		@JsonProperty("url")
		private String url;
	}
	
	@Data
	public static class NotionProperty{
		
		@JsonProperty("id")
		private String id;
		
		@JsonProperty("type")
		private String type;
		
		@JsonProperty("title")
		private List<NotionRichText> title;
		
		@JsonProperty("rich_text")
		private List<NotionRichText> richText;
		
		@JsonProperty("number")
		private Double number;
		
		@JsonProperty("select")
		private NotionSelect select;
		
		@JsonProperty("multi_select")
		private List<NotionSelect> multiSelect;
		
		@JsonProperty("date")
		private NotionDate date;
		
		@JsonProperty("people")
		private List<Object> people;
		
		@JsonProperty("files")
		private List<Object> files;
		
		@JsonProperty("checkbox")
		private Boolean checkbox;
		
		@JsonProperty("url")
		private String url;
		
		@JsonProperty("email")
		private String email;
		
		@JsonProperty("phone_number")
		private String phoneNumber;
		
		@JsonProperty("formula")
		private Map<String, Object> formula;
		
		@JsonProperty("relation")
		private List<Map<String, String>> relation;
		
		@JsonProperty("rollup")
		private Map<String, Object> rollup;
	}
	
	@Data
	public static class NotionRichText{
		
		@JsonProperty("type")
		private String type;
		
		@JsonProperty("text")
		private NotionText text;
		
		@JsonProperty("annotations")
		private Map<String, Object> annotations;
		
		@JsonProperty("plain_text")
		private String plainText;
		
		@JsonProperty("href")
		private String href;
	}
	
	@Data
	public static class NotionText{
		
		@JsonProperty("content")
		private String content;
		
		@JsonProperty("link")
		private Object link;
	}
	
	@Data
	public static class NotionSelect{
		
		@JsonProperty("id")
		private String id;
		
		@JsonProperty("name")
		private String name;
		
		@JsonProperty("color")
		private String color;
	}
	
	@Data
	public static class NotionDate{
		
		@JsonProperty("start")
		private String start;
		
		@JsonProperty("end")
		private String end;
		
		@JsonProperty("time_zone")
		private String timeZone;
	}
}
