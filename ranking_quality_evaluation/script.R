library(tidyverse)
library(scales)

results <- read.csv("results_ndcg.csv", header=TRUE)

# rename the strategies for label 'readability':
results$strategy_name = as.character(results$strategy)

# filter for strategies that were considered for the paper:
strategies = c('ST', 'ST Ext.', 'RTA', 'RTA Ext.', 'HYB', 'HYB Ext.')
results$strategy_name[results$strategy_name == "Subtree"] = 'ST'
results$strategy_name[results$strategy_name == "SubtreeWithUncertaintyPropagationAndPenalty"] = 'ST Ext.'
results$strategy_name[results$strategy_name == "ResponseTimeAnalysis"] = 'RTA'
results$strategy_name[results$strategy_name == "ResponseTimeAnalysisWithUncertaintyAndPenalty"] = 'RTA Ext.'
results$strategy_name[results$strategy_name == "HybridWithUncertaintyPropagation"] = 'HYB'
results$strategy_name[results$strategy_name == "HybridWithUncertaintyPropagationAndPenalty"] = 'HYB Ext.'

results = results %>% filter(strategy_name %in% strategies)

# format and round ndcg scores with precision = 2:
results$label = format(round(results$ndcg, 2), nsmall=2)


# filtering based on calibration runs (penalty == 3, uncertainty mapping == 0, top 5 ranking entries each (nDCG5)):
results = results %>% 
            filter(penalty == 3, weight == "var0", n == 5) %>%
            select(scenario, variant, n, strategy, ndcg, strategy_name, label)

# https://stackoverflow.com/questions/35921635/stacked-bar-ordered-by-sum-of-fill-with-ggplot2

# UDF to create bar charts for the various scenarios:
createBarChart <- function(input, n, scenarioName, scenarioLabels, plotWidth=6.85, plotHeight=4.55, barWidth=0.7, plotLimits=c(0.5,1.005), labelFontSize=3.1) {
   selection = input %>% filter(scenario == scenarioName & n == UQ(n))

   plot <- ggplot(data=selection, aes(x=reorder(strategy_name, ndcg, sum), y=ndcg, fill=variant)) +
      theme_bw() +
      coord_flip() +
      scale_y_continuous(limits=plotLimits,oob = rescale_none) +
      scale_fill_manual(values = c("#d7191c", "#fdae61", "#abd9e9", "#2c7bb6"), name="Scenario:", labels=scenarioLabels) +
      ylab(bquote('nDCG'[.(n)])) +
      xlab("Heuristic") +
      geom_bar(stat="identity", position=position_dodge(width=barWidth), colour="black", width=barWidth) +
      geom_text(aes(label=label), hjust=-0.2, size=labelFontSize, position = position_dodge(width=barWidth)) +
      theme(axis.text = element_text(colour="black", size=11), axis.title=element_text(size=12,face="bold")) +
      theme(legend.position="bottom",
          legend.background = element_rect(fill="white", size=.3, linetype="solid"),
          legend.text = element_text(size=12)) +
      ggsave(paste(scenarioName, "_final_" , "ndcg_", n, ".pdf", sep=""), width = plotWidth, height = plotHeight, units="in")
  
   return(plot)
}

#-----------------------------------------------------------------------------------------

runningLabels = c("Basic", "'payment' delayed")
multichangeLabels = c("Basic", "'j' delayed", "'s' delayed", "'j' & 's' delayed")

createBarChart(results, 5, "running", runningLabels, labelFontSize=4, plotHeight = 4.2)
createBarChart(results, 5, "multichange", multichangeLabels, plotHeight = 6.2, barWidth = 0.8, labelFontSize=3.5)

# the following code can be used to create bar charts for all scenarios on different steps (nDCG3, nDCG5, nDCG7, and nDCG10)
# uncomment to use + adapt filter on results (remove filter on 'n' == 5):

# for(scenario in c("running", "multichange")) {
#    labels = NULL
#    limits = NULL
#    
#    if(scenario == "running") {
#       labels = runningLabels
#       limits = c(0.5, 1.015)
#    }
#    else if(scenario == "multichange") {
#       labels = multichangeLabels
#       limits = c(0.5, 1.005)
#    }
#    
#    for(step in unique(results$n)) {
#       createBarChart(results, 
#                      step, 
#                      scenario, 
#                      scenarioLabels = labels, 
#                      plotHeight = ifelse(scenario=="running", 4.55, 6.5), 
#                      barWidth = ifelse(scenario=="running", 0.7, 0.8),
#                      labelFontSize = ifelse(scenario=="running", 3.1, 2.6),
#                      plotLimits=limits)
#    }
# }


# ---------------

# results of running scenario:
running <- results %>%
   filter("running" == scenario) %>%
   select(strategy_name, ndcg, n) %>%
   group_by(n, strategy_name) %>%
   summarise(ndcg_mean=mean(ndcg)) %>%
   arrange(desc(ndcg_mean), .by_group = TRUE)

View(running)

# -------

# results of multichange scenario:
multichange <- results %>%
   filter("multichange"==scenario) %>%
   select(strategy_name, ndcg, n) %>%
   group_by(n, strategy_name) %>%
   summarise(ndcg_mean=mean(ndcg)) %>%
   arrange(desc(ndcg_mean), .by_group = TRUE)

View(multichange)

# -----------
# all results combined
   
all <- results %>%
   select(scenario, strategy_name, ndcg, n) %>%
   group_by(n, strategy_name) %>%
   summarise(ndcg_mean=mean(ndcg)) %>%
   arrange(desc(ndcg_mean), .by_group = TRUE)

View(all)

# only scenarios with performance deviations:
deviations <- results %>%
   filter(grepl("delay",variant,fixed = TRUE)) %>%
   select(scenario, strategy_name, ndcg, n) %>%
   group_by(n, strategy_name) %>%
   summarise(ndcg_mean=mean(ndcg)) %>%
   arrange(desc(ndcg_mean), .by_group = TRUE)

View(deviations)

# only basic scenarios:
basic <- results %>%
   filter("basic" == variant) %>%
   select(scenario, strategy_name, ndcg, n) %>%
   group_by(n, strategy_name) %>%
   summarise(ndcg_mean=mean(ndcg)) %>%
   arrange(desc(ndcg_mean), .by_group = TRUE)

View(basic)
